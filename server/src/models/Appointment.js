import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bloodBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodBank',
      default: null,
      index: true,
    },
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      default: null,
      index: true,
    },
    facilityType: {
      type: String,
      enum: ['BLOOD_BANK', 'HOSPITAL'],
      default: 'BLOOD_BANK',
    },
    slotDate: {
      type: Date,
      alias: 'appointmentDate',
      required: [true, 'Slot date is required'],
      index: true,
    },
    slotTime: {
      type: String,
      alias: 'timeSlot',
      required: [true, 'Slot time is required'], // e.g. "10:00 AM - 11:00 AM"
    },
    status: {
      type: String,
      enum: ['BOOKED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'SCHEDULED'],
      default: 'BOOKED',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    reminderSent: {
      type: Boolean,
      default: false,
      index: true,
    },
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      default: null,
    },
    unitsDonated: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AppointmentSchema.index({ donor: 1, slotDate: 1 });
AppointmentSchema.index({ bloodBank: 1, slotDate: 1 });
AppointmentSchema.index({ hospital: 1, slotDate: 1 });

export const Appointment = mongoose.model('Appointment', AppointmentSchema);
