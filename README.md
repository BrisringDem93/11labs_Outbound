# Eleven Labs Outbound Caller  

This project demonstrates the integration of **Eleven Labs Conversational AI** with **Twilio** to enable seamless real-time interactions during outbound and inbound phone calls. The system leverages WebSockets for media streaming and integrates Eleven Labs' advanced conversational AI capabilities for human-like interactions.

---

## Features  
- **Outbound Call Integration**: Programmatically initiate outbound calls using Twilio’s API.  
- **Real-Time Media Streaming**: Connect calls to Eleven Labs via WebSockets for audio input and output.  
- **AI-Powered Conversations**: Use Eleven Labs Conversational AI to create dynamic, human-like dialogues.  
- **Simple API Setup**: Easily configure and deploy the project for real-time call control and monitoring.

---

## Getting Started  

Follow these steps to set up and run the project:  

### 1. Clone the Repository  
```bash
git clone https://github.com/BrisringDem93/11labs_Outbound
```

### 2. Navigate to the Project Directory
```bash
cd 11labs_Outbound
```

### 3. Install Dependencies
```bash
npm install
```
4. Install PostgreSQL
Follow the instructions on the PostgreSQL website to install PostgreSQL on your machine.

5. Create the Logs Table
After installing PostgreSQL, create a database and a table for logs. You can use the following SQL commands:

CREATE DATABASE elevenlabs_outbound;

\c elevenlabs_outbound

CREATE TABLE **** (
    id SERIAL PRIMARY KEY,
    call_sid VARCHAR(50) NOT NULL,
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


### 6. Configure the Environment
Create a .env file in the root directory and populate it with your credentials:
```
ELEVENLABS_AGENT_ID=your-eleven-labs-agent-id;
TWILIO_ACCOUNT_SID=your-twilio-account-sid;
TWILIO_AUTH_TOKEN=your-twilio-auth-token;
TWILIO_PHONE_NUMBER=your-twilio-phone-number;
ELEVENLABS_API_KEY= your-eleven-labs-api-key;
PORT=8000;
DB_NAME=;
DB_USER=your-db-user;
DB_PASS=your-db-db
DB_PORT=;

```





### 7. Start the Server

```bash
node index.js
```

### Start Ngrok (OPTIONAL)
Expose your local server to the internet using Ngrok. Run the following command in a new terminal:
```bash
ngrok http 8000
```
### 7. Test the System
For Outbound Calls:
Send a POST request to the /make-outbound-call endpoint with the recipient’s phone number:
```json
curl -X POST http://localhost:8000/make-outbound-call \ or \outbound-call
-H "Content-Type: application/json" \
-d '{"to": "+1234567890"}'
```
