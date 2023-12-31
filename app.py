from flask import Flask, render_template
from flask_sockets import Sockets
import json
import uuid

app = Flask(__name__)
sockets = Sockets(app)

# Dictionary to keep track of WebRTC sessions
webrtc_sessions = {}

@sockets.route('/ws')
def echo_socket(ws):
    while not ws.closed:
        message = ws.receive()
        if message:
            ws.send(message)

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
