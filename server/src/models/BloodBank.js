import mongoose from 'mongoose';

const BloodBankSchema = new mongoose.Schema(
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
      required: [true, 'Blood Bank name is required'],
      trim: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    registrationNumber: {
      type: String,
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
    operatingHours: {
      type: String,
      default: '24/7',
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'APPROVED', 'REJECTED', 'BLOCKED'],
      default: 'PENDING',
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'APPROVED', 'REJECTED', 'BLOCKED'],
      default: 'PENDING',
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
BloodBankSchema.index({ location: '2dsphere' });
BloodBankSchema.index({ verificationStatus: 1, city: 1 });
BloodBankSchema.index({ name: 'text', city: 'text' });

// Synchronize subdocument and alias fields
BloodBankSchema.pre('save', function (next) {
  if (!this.licenseNumber && this.registrationNumber) this.licenseNumber = this.registrationNumber;
  if (!this.registrationNumber && this.licenseNumber) this.registrationNumber = this.licenseNumber;

  if (this.status && !this.verificationStatus) this.verificationStatus = this.status;
  if (this.verificationStatus && !this.status) this.status = this.verificationStatus;
  if (this.isModified('status')) this.verificationStatus = this.status;
  if (this.isModified('verificationStatus')) this.status = this.verificationStatus;

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

  if (this.verificationStatus === 'APPROVED' || this.verificationStatus === 'VERIFIED') {
    this.isVerified = true;
  }

  next();
});

export const BloodBank = mongoose.model('BloodBank', BloodBankSchema);
