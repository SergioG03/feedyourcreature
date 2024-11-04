from app import db
from flask_login import UserMixin

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    is_admin = db.Column(db.Boolean, default=False)
    
    def is_administrator(self):
        return self.is_admin
    
class Character(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(64), nullable=False)
    color = db.Column(db.String(7), nullable=False)  # Store the creature color/type
    current_biome = db.Column(db.String(20), default='light')
    position_x = db.Column(db.Float, default=100.0)
    position_y = db.Column(db.Float, default=100.0)
