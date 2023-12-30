from flask import Flask, render_template, send_file, request  # Added 'request'
from flask_socketio import SocketIO, emit
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, NoEncryption
from cryptography.x509.oid import NameOID
from datetime import datetime, timedelta
import asyncio
import os
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCIceCandidate

# Initialize Flask app
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)

peer_connections = {}

@app.route('/')
def index():
    return render_template('input.html')

@app.route('/output')
def output():
    return render_template('output.html')

@app.route('/stream')
def stream_audio():
    return send_file('test-tone.mp3', mimetype='audio/mp3')

@socketio.on('connect')
def handle_connect():
    print("Client connected:", request.sid)
    peer_connections[request.sid] = RTCPeerConnection()

@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected:", request.sid)
    if request.sid in peer_connections:
        pc = peer_connections.pop(request.sid)
        socketio.start_background_task(lambda: asyncio.create_task(pc.close()))


@socketio.on('offer')
async def handle_offer(data):
    sid = request.sid
    pc = peer_connections[sid]

    offer = RTCSessionDescription(data['sdp'], data['type'])
    await pc.setRemoteDescription(offer)

    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    await emit('answer', {'sdp': pc.localDescription.sdp, 'type': pc.localDescription.type}, room=sid)

@socketio.on('ice_candidate')
async def handle_ice_candidate(data):
    sid = request.sid
    pc = peer_connections[sid]

    candidate = RTCIceCandidate(data['candidate'])
    await pc.addIceCandidate(candidate)


def generate_self_signed_cert(hostname: str, key_out: str, cert_out: str):
    # Generate private key
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    # Write private key to file without encryption
    with open(key_out, "wb") as f:
        f.write(key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption()))


    # Generate a self-signed certificate
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, u"US"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, u"Hawaii"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, u"Honolulu"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"Innr Cloud"),
        x509.NameAttribute(NameOID.COMMON_NAME, hostname),
    ])

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.utcnow())
        .not_valid_after(datetime.utcnow() + timedelta(days=10))  # Certificate valid for 10 days
        .add_extension(x509.SubjectAlternativeName([x509.DNSName(hostname)]), critical=False)
        .sign(key, hashes.SHA256())
    )

    # Write certificate to file
    with open(cert_out, "wb") as f:
        f.write(cert.public_bytes(Encoding.PEM))

if __name__ == '__main__':
    hostname = 'localhost'
    key_file = 'key.pem'
    cert_file = 'cert.pem'
    
    # Generate self-signed cert
    generate_self_signed_cert(hostname, key_file, cert_file)

    # Run Flask app with SSL context
    socketio.run(app, host='0.0.0.0', port=5443, debug=True, keyfile=key_file, certfile=cert_file)

    # Consider when to delete these files, as they're needed for the server's lifetime
    # os.remove(cert_file)
    # os.remove(key_file)