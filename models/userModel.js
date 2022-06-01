const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
// name , email , photo , password , passwordConfirm
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  name: {
    type: String,
    required: [true, 'Please tell us your name!']
  },
  employeeNumber: {
    type: Number,
    required: [true, 'Please provide your employee number'],
    unique: true
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'admin', 'HR'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    //THIS rowks only on the .create . save
    validate: {
      validator: function(el) {
        return el === this.password;
      },
      message: 'Password are not the same'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  //HASHING THE PASSWORD
  this.password = await bcrypt.hash(this.password, 12);
  //Delete password confirm
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password' || this.isNew)) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});
//QUERY MIDDLEWARE
userSchema.pre(/^find/, function(next) {
  //This points to the current query or document that is processing
  this.find({ active: { $ne: false } });
  next();
});
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordsAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;