from flask import Flask, render_template
from flask_sockets import Sockets
import json
import uuid

app = Flask(__name__)
sockets = Sockets(app)

# Dictionary to keep track of WebRTC sessions
webrtc_sessions = {}

@sockets.route('/ws')
def websocket(ws):
    client_session_id = None

    while not ws.closed:
        message = ws.receive()

        if message:
            data = json.loads(message)
            session_id = data.get("session_id")
            if session_id:
                client_session_id = session_id

                # Initialize session data structure if not present
                if session_id not in webrtc_sessions:
                    webrtc_sessions[session_id] = {"clients": [ws]}
                else:
                    if ws not in webrtc_sessions[session_id]["clients"]:
                        webrtc_sessions[session_id]["clients"].append(ws)

                # Broadcast the message to other participants in the session
                for client in webrtc_sessions[session_id]["clients"]:
                    if client != ws:
                        try:
                            client.send(message)
                        except Exception as e:
                            print(f"Error sending message: {e}")
                            webrtc_sessions[client_session_id]["clients"].remove(client)

    # Cleanup on WebSocket disconnection
    if client_session_id and client_session_id in webrtc_sessions:
        webrtc_sessions[client_session_id]["clients"].remove(ws)
        if not webrtc_sessions[client_session_id]["clients"]:
            del webrtc_sessions[client_session_id]

@app.route('/session_id')
def session_id():
    # Generate a new UUID for the session
    session_id = str(uuid.uuid4())
    return session_id

@app.route('/')
def index():
    return render_template('input.html')

@app.route('/output')
def output():
    return render_template('output.html')

if __name__ == '__main__':
    app.debug = True
    from gevent import pywsgi
    from geventwebsocket.handler import WebSocketHandler
    server = pywsgi.WSGIServer(('', 5000), app, handler_class=WebSocketHandler)
    server.serve_forever()
