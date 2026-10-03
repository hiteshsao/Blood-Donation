import mongoose from 'mongoose';

const HospitalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      alias: 'createdBy',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: [true, 'Hospital license number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    licenseDocUrl: {
      type: String,
      default: null,
    },
    address: {
      line: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true },
      state: { type: String, default: '', trim: true },
      pincode: { type: String, default: '', trim: true },
    },
    // Top-level fields for direct queries
    city: {
      type: String,
      default: '',
      trim: true,
      index: true,
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
    contact: {
      phone: { type: String, default: '', trim: true },
      email: { type: String, default: '', lowercase: true, trim: true },
      emergencyContact: { type: String, default: '', trim: true },
    },
    // Direct top-level accessors
    email: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', 'BLOCKED'],
      default: 'PENDING',
      alias: 'status',
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0],
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
HospitalSchema.index({ location: '2dsphere' });
HospitalSchema.index({ name: 'text', city: 'text' });
HospitalSchema.index({ verificationStatus: 1, city: 1 });

// Synchronize subdocument fields with flat fields
HospitalSchema.pre('save', function (next) {
  if (this.address) {
    if (typeof this.address === 'string') {
      const addrStr = this.address;
      this.address = { line: addrStr, city: this.city || '', state: this.state || '', pincode: this.pincode || '' };
    } else {
      if (this.address.city && !this.city) this.city = this.address.city;
      if (this.address.state && !this.state) this.state = this.address.state;
      if (this.address.pincode && !this.pincode) this.pincode = this.address.pincode;
      if (this.city && !this.address.city) this.address.city = this.city;
    }
  }

  if (this.contact) {
    if (this.contact.phone && !this.phone) this.phone = this.contact.phone;
    if (this.contact.email && !this.email) this.email = this.contact.email;
    if (this.phone && !this.contact.phone) this.contact.phone = this.phone;
    if (this.email && !this.contact.email) this.contact.email = this.email;
  }

  if (this.isModified('verificationStatus')) {
    this.isVerified = this.verificationStatus === 'VERIFIED';
  } else if (this.isModified('isVerified')) {
    this.verificationStatus = this.isVerified ? 'VERIFIED' : 'PENDING';
  }

  next();
});

export const Hospital = mongoose.model('Hospital', HospitalSchema);
