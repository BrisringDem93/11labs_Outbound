// outbound.js
import WebSocket from "ws";
import dotenv from "dotenv";
import Twilio from "twilio";

dotenv.config();

const {
  ELEVENLABS_API_KEY,
  ELEVENLABS_AGENT_ID,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
} = process.env;

// Helper function to get signed URL for authenticated conversations
async function getSignedUrl() {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get signed URL: ${response.statusText}`);
    }

    const data = await response.json();
    return data.signed_url;
  } catch (error) {
    console.error("Error getting signed URL:", error);
    throw error;
  }
}

// Funzione principale per registrare le route outbound
export default function registerOutboundRoutes(fastify) {
  // Initialize Twilio client
  const twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  // Route to initiate outbound calls (versione unificata)
  fastify.post("/outbound-call", async (request, reply) => {
    const {
      number,
      prompt,
      first_message,
      dynamic_variables,
      conversation_config_override,
    } = request.body;

    if (!number) {
      return reply.code(400).send({ error: "Phone number is required" });
    }

    try {
      // Determina se usare la configurazione avanzata o base
      if (dynamic_variables || conversation_config_override) {
        // Formato avanzato: usa dynamic_variables e conversation_config_override
        const configPayload = {
          dynamic_variables: dynamic_variables || {},
          conversation_config_override: conversation_config_override || {},
        };

        const encodedConfig = Buffer.from(
          JSON.stringify(configPayload),
          "utf-8",
        ).toString("base64");
        const urlSafeConfig = encodeURIComponent(encodedConfig);

        const call = await twilioClient.calls.create({
          from: TWILIO_PHONE_NUMBER,
          to: number,
          url: `https://${request.headers.host}/outbound-call-twiml?config=${urlSafeConfig}`,
        });

        reply.send({
          success: true,
          message: "Call initiated with advanced configuration",
          callSid: call.sid,
        });
      } else {
        // Formato legacy: usa solo prompt e first_message
        const url = `https://${request.headers.host}/outbound-call-twiml?prompt=${encodeURIComponent(
          prompt || "",
        )}&first_message=${encodeURIComponent(first_message || "")}`;

        const call = await twilioClient.calls.create({
          from: TWILIO_PHONE_NUMBER,
          to: number,
          url: url,
        });

        reply.send({
          success: true,
          message: "Call initiated",
          callSid: call.sid,
        });
      }
    } catch (error) {
      console.error("Error initiating outbound call:", error);
      reply.code(500).send({
        success: false,
        error: "Failed to initiate call",
        details: error.message,
      });
    }
  });

  // TwiML route unificata per outbound calls
  fastify.all("/outbound-call-twiml", async (request, reply) => {
    let streamUrl, parameters;

    // Determina il tipo di configurazione dalle query params
    if (request.query.config) {
      // Modalità configurazione avanzata
      streamUrl = `wss://${request.headers.host}/outbound-media-stream`;
      parameters = `<Parameter name="config" value="${request.query.config}" />`;
    } else {
      // Modalità legacy
      const prompt = request.query.prompt || "";
      const first_message = request.query.first_message || "";
      streamUrl = `wss://${request.headers.host}/outbound-media-stream`;
      parameters = `<Parameter name="prompt" value="${prompt}" />
            <Parameter name="first_message" value="${first_message}" />`;
    }

    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Connect>
        <Stream url="${streamUrl}">
          ${parameters}
        </Stream>
      </Connect>
    </Response>`;

    reply.type("text/xml").send(twimlResponse);
  });

  // WebSocket route unificata per handling media streams
  fastify.register(async (fastifyInstance) => {
    fastifyInstance.get(
      "/outbound-media-stream",
      { websocket: true },
      (ws, req) => {
        console.info("[Server] Twilio connected to outbound media stream");

        // Variables to track the call
        let streamSid = null;
        let callSid = null;
        let elevenLabsWs = null;
        let customParameters = null;
        let configData = null;
        let isConfigMode = false;

        // Handle WebSocket errors
        ws.on("error", console.error);

        // Set up ElevenLabs connection
        const setupElevenLabs = async () => {
          try {
            const signedUrl = await getSignedUrl();
            elevenLabsWs = new WebSocket(signedUrl);

            elevenLabsWs.on("open", () => {
              console.log("[ElevenLabs] Connected to Conversational AI");
              // Non inviamo la configurazione ora, aspettiamo il metadata o evento start
            });

            elevenLabsWs.on("message", (data) => {
              try {
                const message = JSON.parse(data);

                switch (message.type) {
                  case "conversation_initiation_metadata":
                    console.log("[ElevenLabs] Received initiation metadata");

                    // Invia la configurazione dopo aver ricevuto il metadata
                    if (isConfigMode && configData) {
                      // Modalità config
                      const initialConfig = {
                        type: "conversation_initiation_client_data",
                        dynamic_variables: configData.dynamic_variables || {},
                        conversation_config_override: {
                          agent: {},
                        },
                      };

                      // Use config_override if provided
                      if (
                        configData.conversation_config_override &&
                        Object.keys(configData.conversation_config_override)
                          .length > 0
                      ) {
                        initialConfig.conversation_config_override =
                          configData.conversation_config_override;

                        // Ensure agent object always exists
                        if (!initialConfig.conversation_config_override.agent) {
                          initialConfig.conversation_config_override.agent = {};
                        }
                      }

                      console.log(
                        "[ElevenLabs] Sending advanced configuration",
                      );
                      elevenLabsWs.send(JSON.stringify(initialConfig));
                    } else if (customParameters) {
                      // Modalità legacy
                      const initialConfig = {
                        type: "conversation_initiation_client_data",
                        conversation_config_override: {
                          agent: {
                            prompt: {
                              prompt:
                                customParameters.prompt ||
                                "you are a gary from the phone store",
                            },
                            first_message:
                              customParameters.first_message ||
                              "hey there! how can I help you today?",
                          },
                        },
                      };

                      console.log(
                        "[ElevenLabs] Sending standard configuration",
                      );
                      elevenLabsWs.send(JSON.stringify(initialConfig));
                    } else {
                      // Default configuration
                      const defaultConfig = {
                        type: "conversation_initiation_client_data",
                        conversation_config_override: {
                          agent: {},
                        },
                      };
                      console.log("[ElevenLabs] Sending default configuration");
                      elevenLabsWs.send(JSON.stringify(defaultConfig));
                    }
                    break;

                  case "audio":
                    if (streamSid) {
                      let audioData;
                      if (message.audio?.chunk) {
                        audioData = {
                          event: "media",
                          streamSid,
                          media: {
                            payload: message.audio.chunk,
                          },
                        };
                      } else if (message.audio_event?.audio_base_64) {
                        audioData = {
                          event: "media",
                          streamSid,
                          media: {
                            payload: message.audio_event.audio_base_64,
                          },
                        };
                      }

                      if (audioData) {
                        ws.send(JSON.stringify(audioData));
                      }
                    } else {
                      console.log(
                        "[ElevenLabs] Received audio but no StreamSid yet",
                      );
                    }
                    break;

                  case "interruption":
                    if (streamSid) {
                      ws.send(JSON.stringify({ event: "clear", streamSid }));
                    }
                    break;

                  case "ping":
                    if (message.ping_event?.event_id) {
                      elevenLabsWs.send(
                        JSON.stringify({
                          type: "pong",
                          event_id: message.ping_event.event_id,
                        }),
                      );
                    }
                    break;

                  case "agent_response":
                    console.log(
                      `[Twilio] Agent response: ${message.agent_response_event?.agent_response}`,
                    );
                    break;

                  case "user_transcript":
                    console.log(
                      `[Twilio] User transcript: ${message.user_transcription_event?.user_transcript}`,
                    );
                    break;

                  default:
                    console.log(
                      `[ElevenLabs] Unhandled message type: ${message.type}`,
                    );
                }
              } catch (error) {
                console.error("[ElevenLabs] Error processing message:", error);
              }
            });

            elevenLabsWs.on("error", (error) => {
              console.error("[ElevenLabs] WebSocket error:", error);
            });

            elevenLabsWs.on("close", () => {
              console.log("[ElevenLabs] Disconnected");

              if (callSid) {
                twilioClient
                  .calls(callSid)
                  .update({ status: "completed" })
                  .then(() =>
                    console.log(`Call ${callSid} terminated successfully`),
                  )
                  .catch((err) =>
                    console.error(`Error terminating call: ${err}`),
                  );
              }
            });
          } catch (error) {
            console.error("[ElevenLabs] Setup error:", error);
          }
        };

        // Set up ElevenLabs connection
        setupElevenLabs();

        // Handle messages from Twilio
        ws.on("message", (message) => {
          try {
            const msg = JSON.parse(message);
            if (msg.event !== "media") {
              console.log(`[Twilio] Received event: ${msg.event}`);
            }

            switch (msg.event) {
              case "start":
                streamSid = msg.start.streamSid;
                callSid = msg.start.callSid;
                customParameters = msg.start.customParameters || {}; // Store parameters

                // Determina la modalità di configurazione
                if (customParameters.config) {
                  isConfigMode = true;
                  try {
                    const decodedConfig = Buffer.from(
                      decodeURIComponent(customParameters.config),
                      "base64",
                    ).toString("utf-8");

                    configData = JSON.parse(decodedConfig);
                    console.log("[Twilio] Successfully decoded configuration");
                  } catch (error) {
                    console.error(
                      "[Twilio] Error decoding configuration:",
                      error,
                    );
                  }
                }

                console.log(
                  `[Twilio] Stream started - StreamSid: ${streamSid}, CallSid: ${callSid}`,
                );
                if (!isConfigMode) {
                  console.log("[Twilio] Parameters:", customParameters);
                }
                break;

              case "media":
                if (elevenLabsWs?.readyState === WebSocket.OPEN) {
                  const audioMessage = {
                    user_audio_chunk: Buffer.from(
                      msg.media.payload,
                      "base64",
                    ).toString("base64"),
                  };
                  elevenLabsWs.send(JSON.stringify(audioMessage));
                }
                break;

              case "stop":
                console.log(`[Twilio] Stream ${streamSid} ended`);
                if (elevenLabsWs?.readyState === WebSocket.OPEN) {
                  elevenLabsWs.close();
                }
                break;

              default:
                console.log(`[Twilio] Unhandled event: ${msg.event}`);
            }
          } catch (error) {
            console.error("[Twilio] Error processing message:", error);
          }
        });

        // Handle WebSocket closure
        ws.on("close", () => {
          console.log("[Twilio] Client disconnected");
          if (elevenLabsWs?.readyState === WebSocket.OPEN) {
            elevenLabsWs.close();
          }
        });
      },
    );
  });
}
