import os
from dotenv import load_dotenv
from flask import Flask, render_template, session, request, redirect, url_for, flash, jsonify
from flask_socketio import SocketIO, emit
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user

load_dotenv()

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "game_secret_key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)
socketio = SocketIO(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Global game state
players = {}

@login_manager.user_loader
def load_user(id):
    from models import User
    return User.query.get(int(id))

@app.route('/')
def index():
    return render_template('base.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        from models import User
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for('character_creator'))
        flash('Invalid username or password')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        from models import User
        username = request.form.get('username')
        password = request.form.get('password')
        
        if User.query.filter_by(username=username).first():
            flash('Username already exists')
            return redirect(url_for('register'))
            
        user = User(username=username, password_hash=generate_password_hash(password))
        db.session.add(user)
        db.session.commit()
        login_user(user)
        return redirect(url_for('character_creator'))
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/game')
@login_required
def game():
    from models import Character
    characters = Character.query.filter_by(user_id=current_user.id).all()
    if not characters:
        flash('Please create a character first')
        return redirect(url_for('character_creator'))
        
    character = Character.query.get(session.get('active_character_id'))
    if not character or character.user_id != current_user.id:
        flash('Please select a character to play')
        return redirect(url_for('character_creator'))
    return render_template('game.html', character=character)

@app.route('/character_creator', methods=['GET'])
@login_required
def character_creator():
    from models import Character
    characters = Character.query.filter_by(user_id=current_user.id).all()
    return render_template('character_creator.html', characters=characters)

@app.route('/save_character', methods=['POST'])
@login_required
def save_character():
    from models import Character
    name = request.form.get('name')
    color = request.form.get('color')  # This will now be the creature color scheme
    
    character = Character(
        user_id=current_user.id,
        name=name,
        color=color,
        current_biome='light'
    )
    db.session.add(character)
    db.session.commit()
    
    session['active_character_id'] = character.id
    flash('Character created successfully!')
    return redirect(url_for('character_creator'))

@app.route('/select_character/<int:character_id>', methods=['POST'])
@login_required
def select_character(character_id):
    from models import Character
    character = Character.query.get_or_404(character_id)
    if character.user_id != current_user.id:
        flash('Unauthorized')
        return redirect(url_for('character_creator'))
        
    session['active_character_id'] = character_id
    flash('Character selected successfully!')
    return redirect(url_for('game'))

@socketio.on('connect')
def handle_connect():
    if current_user.is_authenticated:
        from models import Character
        character = Character.query.get(session.get('active_character_id'))
        if character and character.user_id == current_user.id:
            players[request.sid] = {
                'id': request.sid,
                'username': current_user.username,
                'position': {'x': 100, 'y': 100},
                'biome': character.current_biome,
                'color': character.color,
                'type': character.color  # Use color as type for the pixel art creature
            }
            emit('players_update', players, broadcast=True)

@socketio.on('request_character_data')
def handle_character_data_request():
    if current_user.is_authenticated:
        from models import Character
        character = Character.query.get(session.get('active_character_id'))
        if character and character.user_id == current_user.id:
            emit('character_data', {
                'color': character.color,
                'type': character.color,  # Use color as type for the pixel art creature
                'biome': character.current_biome
            })

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in players:
        del players[request.sid]
        emit('players_update', players, broadcast=True)

@socketio.on('player_move')
def handle_move(data):
    if request.sid in players:
        players[request.sid]['position'] = data['position']
        emit('players_update', players, broadcast=True)

@socketio.on('change_biome')
def handle_biome_change(data):
    if request.sid in players:
        players[request.sid]['biome'] = data['biome']
        from models import Character
        character = Character.query.get(session.get('active_character_id'))
        if character and character.user_id == current_user.id:
            character.current_biome = data['biome']
            db.session.commit()
        emit('players_update', players, broadcast=True)

@socketio.on('chat_message')
def handle_chat_message(data):
    if current_user.is_authenticated and request.sid in players:
        message = data.get('message', '').strip()
        if message and len(message) <= 100:
            emit('chat_message', {
                'username': current_user.username,
                'message': message
            }, broadcast=True)

# Generate creatures when the application starts
with app.app_context():
    import models
    db.create_all()
    # Migration to remove size column
    db.session.execute(text('ALTER TABLE character DROP COLUMN IF EXISTS size'))
    db.session.commit()
    # Generate pixel art creatures
    from generate_creatures import generate_all_creatures
    generate_all_creatures()
