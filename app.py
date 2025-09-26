# app.py
import os
from flask import Flask, render_template, request, redirect, url_for, jsonify, send_from_directory
import pandas as pd
from datetime import datetime, timedelta
import qrcode
from utils.prediction import load_historical, crowd_forecast
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/assets/qrcodes'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

DATA_DIR = 'data'
HIST_PATH = os.path.join(DATA_DIR, 'historical.csv')
BOOKINGS_PATH = os.path.join(DATA_DIR, 'bookings.csv')
PARKING_PATH = os.path.join(DATA_DIR, 'parking.csv')

GOOGLE_MAPS_API_KEY = "AIzaSyB6qWoz64qUth_z1bktG0sa5zkxgNIeVZo"


# ensure bookings file exists
if not os.path.exists(BOOKINGS_PATH):
    df = pd.DataFrame(columns=['booking_id','name','phone','email','date','slot_time','queue_type','qr_path','created_at'])
    df.to_csv(BOOKINGS_PATH, index=False)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/dashboard')
def dashboard():
    hist = load_historical(HIST_PATH)
    forecasts = crowd_forecast(hist, days=3)
    # temple schedule (sample)
    schedule = [
        {'event':'Morning Aarti','time':'05:30'},
        {'event':'Special Aarti','time':'09:00'},
        {'event':'Noon Aarti','time':'12:00'},
        {'event':'Evening Aarti','time':'18:30'},
    ]
    return render_template('dashboard.html', forecasts=forecasts, schedule=schedule, google_maps_key=GOOGLE_MAPS_API_KEY)


@app.route('/api/wait-times')
def wait_times():
    df = pd.read_csv(HIST_PATH)
    latest = df.groupby('queue_type').agg({'avg_wait_minutes':'mean'}).reset_index()
    data = {row['queue_type']: int(row['avg_wait_minutes']) for _, row in latest.iterrows()}
    return jsonify(data)


@app.route('/api/book', methods=['POST'])
def book_slot():
    payload = request.json
    name = payload.get('name')
    phone = payload.get('phone')
    email = payload.get('email')
    date = payload.get('date')
    slot_time = payload.get('slot_time')
    queue_type = payload.get('queue_type')

    booking_id = f"B{int(datetime.utcnow().timestamp())}"
    qr_filename = f"{booking_id}.png"
    qr_path = os.path.join(app.config['UPLOAD_FOLDER'], qr_filename)

    # generate QR
    qr = qrcode.QRCode(box_size=6, border=2)
    qr.add_data({'booking_id':booking_id,'name':name,'date':date,'slot_time':slot_time})
    img = qr.make_image()
    img.save(qr_path)

    df = pd.read_csv(BOOKINGS_PATH)
    new = {
        'booking_id':booking_id,
        'name':name,
        'phone':phone,
        'email':email,
        'date':date,
        'slot_time':slot_time,
        'queue_type':queue_type,
        'qr_path':qr_path,
        'created_at':datetime.utcnow().isoformat()
    }
    df = df.append(new, ignore_index=True)
    df.to_csv(BOOKINGS_PATH, index=False)

    # In a real app we'd send SMS/email now
    return jsonify({'status':'ok','booking_id':booking_id,'qr_url':url_for('static', filename=f'assets/qrcodes/{qr_filename}')}), 201


@app.route('/api/parking')
def parking():
    df = pd.read_csv(PARKING_PATH)
    slots = df.to_dict(orient='records')
    return jsonify(slots)


@app.route('/api/sos', methods=['POST'])
def sos():
    data = request.json
    name = data.get('name')
    lat = data.get('lat')
    lng = data.get('lng')
    # log SOS (in real app, notify security via SMS/dispatcher)
    print(f"SOS from {name} at {lat},{lng} - notify security")
    return jsonify({'status':'alert_sent'})


if __name__ == '__main__':
    app.run(debug=True)