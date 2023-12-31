from flask import Flask, render_template
from flask_sockets import Sockets
import json

app = Flask(__name__)
sockets = Sockets(app)

# Dictionary to keep track of WebRTC sessions, including offers, answers, ice candidates, and clients
webrtc_sessions = {}

@sockets.route('/ws')
def websocket(ws):
    while not ws.closed:
        message = ws.receive()

        if message:
            data = json.loads(message)
            session_id = data.get("session_id")
            if session_id:
                # Initialize session data structure if not present
                if session_id not in webrtc_sessions:
                    webrtc_sessions[session_id] = {
                        "offers": [], "answers": [], "ice_candidates": [], "clients": [ws]
                    }
                else:
                    # Add the WebSocket client to the session if not already added
                    if ws not in webrtc_sessions[session_id]["clients"]:
                        webrtc_sessions[session_id]["clients"].append(ws)

                # Handle different types of messages
                if "offer" in data:
                    webrtc_sessions[session_id]["offers"].append(data["offer"])
                elif "answer" in data:
                    webrtc_sessions[session_id]["answers"].append(data["answer"])
                elif "ice_candidate" in data:
                    webrtc_sessions[session_id]["ice_candidates"].append(data["ice_candidate"])

                # Broadcast the message to other participants in the session
                for client in webrtc_sessions[session_id]["clients"]:
                    if client != ws:
                        client.send(message)

@app.route('/')
def index():
    return render_template('input.html')

@app.route('/output')
def output():
    return render_template('output.html')

if __name__ == '__main__':
    app.debug = True  # Enable debug mode
    from gevent import pywsgi
    from geventwebsocket.handler import WebSocketHandler
    server = pywsgi.WSGIServer(('', 5000), app, handler_class=WebSocketHandler)
    server.serve_forever()
