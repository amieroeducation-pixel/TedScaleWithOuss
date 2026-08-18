"""
SMS Bridge Server - Envoie des SMS gratuits via iPhone
Lance un serveur Flask local qui reçoit les demandes SMS du Dashboard
et déclenche un Raccourci iOS pour envoyer le SMS depuis l'iPhone de Ted.

Usage:
    python server.py

Endpoints:
    POST /sms/send
    Body: {"phone": "0612345678", "message": "Bonjour {prenom}"}
    Returns: {"success": true, "message": "SMS envoyé via iPhone"}
"""

from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
import urllib.parse
import logging
import qrcode
import io
import base64

app = Flask(__name__)
CORS(app)  # Permet les requêtes depuis localhost:3000

# Configuration logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Stockage du dernier SMS (en mémoire)
last_sms = {
    'phone': None,
    'message': None,
    'qr_code': None,
    'shortcut_url': None
}

@app.route('/sms/send', methods=['POST'])
def send_sms():
    """
    Endpoint pour envoyer un SMS via iPhone

    Body JSON attendu:
    {
        "phone": "0612345678",
        "message": "Ton message ici"
    }
    """
    try:
        data = request.get_json()

        if not data or 'phone' not in data or 'message' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing phone or message in request body'
            }), 400

        phone = data['phone']
        message = data['message']

        # Normaliser le numéro (enlever espaces, tirets)
        phone_clean = phone.replace(' ', '').replace('-', '').replace('.', '')

        # Convertir 06 -> +336 si nécessaire
        if phone_clean.startswith('06') or phone_clean.startswith('07'):
            phone_clean = '+33' + phone_clean[1:]
        elif phone_clean.startswith('0'):
            phone_clean = '+33' + phone_clean[1:]

        # Créer l'URL scheme pour le Raccourci iOS
        # Format: shortcuts://run-shortcut?name=EnvoiSMS&input=PHONE|MESSAGE
        shortcut_name = 'EnvoiSMS'
        shortcut_input = f"{phone_clean}|{message}"
        encoded_input = urllib.parse.quote(shortcut_input)
        shortcut_url = f"shortcuts://run-shortcut?name={shortcut_name}&input={encoded_input}"

        logger.info(f"Envoi SMS vers {phone_clean}: {message[:50]}...")

        # Générer QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(shortcut_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        # Convertir en base64 pour l'envoyer dans la réponse JSON
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        qr_data_url = f'data:image/png;base64,{qr_base64}'

        # Stocker le dernier SMS
        last_sms['phone'] = phone_clean
        last_sms['message'] = message
        last_sms['qr_code'] = qr_data_url
        last_sms['shortcut_url'] = shortcut_url

        return jsonify({
            'success': True,
            'message': 'QR Code généré - Ouvre http://localhost:5001/qr dans ton navigateur',
            'phone': phone_clean,
            'shortcut_url': shortcut_url,
            'qr_code': qr_data_url,
            'qr_page_url': 'http://localhost:5001/qr'
        })

    except Exception as e:
        logger.error(f"Erreur envoi SMS: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Endpoint de health check"""
    return jsonify({'status': 'ok', 'service': 'SMS Bridge Server'})

@app.route('/qr', methods=['GET'])
def qr_page():
    """Page web avec QR code pour scanner avec iPhone"""
    return render_template('qr.html')

@app.route('/sms/latest', methods=['GET'])
def latest_sms():
    """Retourne le dernier SMS généré"""
    if last_sms['phone'] is None:
        return jsonify({
            'success': False,
            'message': 'Aucun SMS en attente'
        })

    return jsonify({
        'success': True,
        'phone': last_sms['phone'],
        'message': last_sms['message'],
        'qr_code': last_sms['qr_code'],
        'shortcut_url': last_sms['shortcut_url']
    })

if __name__ == '__main__':
    print("=" * 60)
    print("SMS Bridge Server - Démarré sur http://localhost:5001")
    print("=" * 60)
    print("\nPour envoyer un SMS depuis le Dashboard:")
    print("1. Garde ce serveur actif")
    print("2. Configure le Raccourci 'EnvoiSMS' sur ton iPhone")
    print("3. Connecte ton iPhone au même réseau WiFi que le PC")
    print("4. Le Dashboard enverra les SMS automatiquement\n")

    app.run(host='0.0.0.0', port=5002, debug=False)
