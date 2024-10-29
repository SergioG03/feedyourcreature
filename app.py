import os
from flask import Flask, render_template, session, request, redirect, url_for, flash, jsonify
from flask_socketio import SocketIO, emit
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from admin_middleware import admin_required

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
    color = request.form.get('color')
    
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

# Admin routes
@app.route('/admin')
@login_required
@admin_required
def admin_panel():
    from models import User, Character
    users = User.query.all()
    characters = Character.query.all()
    return render_template('admin.html', users=users, characters=characters)

@app.route('/admin/users/<int:user_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_user(user_id):
    from models import User, Character
    user = User.query.get_or_404(user_id)
    if user.id == current_user.id:
        return jsonify({'error': 'Cannot delete yourself'}), 400
    
    Character.query.filter_by(user_id=user_id).delete()
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted successfully'})

@app.route('/admin/users/<int:user_id>', methods=['PUT'])
@login_required
@admin_required
def update_user(user_id):
    from models import User
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    if 'username' in data:
        user.username = data['username']
    
    db.session.commit()
    return jsonify({'message': 'User updated successfully'})

@app.route('/admin/characters/<int:character_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_character(character_id):
    from models import Character
    character = Character.query.get_or_404(character_id)
    db.session.delete(character)
    db.session.commit()
    return jsonify({'message': 'Character deleted successfully'})

@app.route('/admin/characters/<int:character_id>', methods=['PUT'])
@login_required
@admin_required
def update_character(character_id):
    from models import Character
    character = Character.query.get_or_404(character_id)
    data = request.get_json()
    
    if 'name' in data:
        character.name = data['name']
    if 'color' in data:
        character.color = data['color']
    
    db.session.commit()
    return jsonify({'message': 'Character updated successfully'})

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
                'type': character.color
            }
            emit('players_update', players, broadcast=True)

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

# Create admin user on startup
def create_admin_user():
    from models import User
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        admin = User(
            username='admin',
            password_hash=generate_password_hash('admin123'),
            is_admin=True
        )
        db.session.add(admin)
        db.session.commit()
        print("Admin user created")

# Initialize database and create admin user
with app.app_context():
    import models
    db.create_all()
    db.session.execute(text('ALTER TABLE character DROP COLUMN IF EXISTS size'))
    db.session.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE'))
    db.session.commit()
    create_admin_user()
    from generate_creatures import generate_all_creatures
    generate_all_creatures()
