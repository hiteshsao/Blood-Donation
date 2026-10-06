import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide full name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Please provide phone number'],
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    password: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ['USER', 'DONOR', 'HOSPITAL', 'BLOOD_BANK', 'ADMIN'],
      default: 'USER',
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'BLOCKED', 'PENDING', 'INACTIVE'],
      default: 'PENDING',
      index: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    isDonor: {
      type: Boolean,
      default: false,
      index: true,
    },
    address: {
      line: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true },
      state: { type: String, default: '', trim: true },
      pincode: { type: String, default: '', trim: true },
    },
    // Backwards-compatible flat address fields for queries
    city: {
      type: String,
      default: '',
      trim: true,
    },
    state: {
      type: String,
      default: '',
      trim: true,
    },
    pincode: {
      type: String,
      default: '',
      trim: true,
    },
    // GeoJSON Point for geospatial 2dsphere indexing
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    locationUpdatedAt: {
      type: Date,
      default: () => new Date(),
    },
    shareContact: {
      type: Boolean,
      default: true,
    },
    shareLocation: {
      type: Boolean,
      default: true,
    },
    profilePhoto: {
      type: String,
      default: null,
    },
    profilePhotoUrl: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    dob: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
      default: null,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      default: null,
      index: true,
    },
    emergencyContact: {
      name: { type: String, default: '' },
      relation: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    verificationOtp: {
      type: {
        codeHash: String,
        expiresAt: Date,
      },
      _id: false,
      select: false,
    },
    passwordResetOtp: {
      type: {
        codeHash: String,
        expiresAt: Date,
      },
      _id: false,
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.passwordHash;
        delete ret.verificationOtp;
        delete ret.passwordResetOtp;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.passwordHash;
        delete ret.verificationOtp;
        delete ret.passwordResetOtp;
        delete ret.refreshToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
UserSchema.index({ location: '2dsphere' });
UserSchema.index({ bloodGroup: 1, 'address.city': 1 });
UserSchema.index({ role: 1, status: 1 });

// Pre-validation hook to synchronize fields before required checks run
UserSchema.pre('validate', function (next) {
  if (this.phone && !this.mobile) this.mobile = this.phone;
  if (this.mobile && !this.phone) this.phone = this.mobile;

  if (this.password && !this.passwordHash) this.passwordHash = this.password;
  if (this.passwordHash && !this.password) this.password = this.passwordHash;

  next();
});

// Synchronize fields before save
UserSchema.pre('save', async function (next) {
  if (this.phone && !this.mobile) this.mobile = this.phone;
  if (this.mobile && !this.phone) this.phone = this.mobile;

  if (this.profilePhoto && !this.profilePhotoUrl) this.profilePhotoUrl = this.profilePhoto;
  if (this.profilePhotoUrl && !this.profilePhoto) this.profilePhoto = this.profilePhotoUrl;

  const verifiedVal = this.isEmailVerified || this.emailVerified || this.isVerified || false;
  this.isEmailVerified = verifiedVal;
  this.emailVerified = verifiedVal;
  this.isVerified = verifiedVal;

  if (this.address) {
    if (this.address.city && !this.city) this.city = this.address.city;
    if (this.address.state && !this.state) this.state = this.address.state;
    if (this.address.pincode && !this.pincode) this.pincode = this.address.pincode;
    if (this.city && !this.address.city) this.address.city = this.city;
  }
  
  // If role is DONOR, also set isDonor to true
  if (this.role === 'DONOR') {
    this.isDonor = true;
  }

  // Password hashing synchronization with bcrypt cost 12
  if (this.isModified('password') && this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordHash = this.password;
  } else if (this.isModified('passwordHash') && this.passwordHash && !this.passwordHash.startsWith('$2a$') && !this.passwordHash.startsWith('$2b$')) {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    this.password = this.passwordHash;
  }

  if (!this.passwordHash && this.password) this.passwordHash = this.password;
  if (!this.password && this.passwordHash) this.password = this.passwordHash;

  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  const hash = this.passwordHash || this.password;
  if (!hash) return false;
  return await bcrypt.compare(enteredPassword, hash);
};

export const User = mongoose.model('User', UserSchema);
