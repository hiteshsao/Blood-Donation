import mongoose from 'mongoose';

await mongoose.connect('mongodb://127.0.0.1:27017/blood_donation_db');
const coll = mongoose.connection.db.collection('bloodrequests');

const docs = await coll.find({ confirmedReceived: true }).toArray();
let updated = 0;
for (const doc of docs) {
  if (!doc.receivedAt && doc.confirmedAt) {
    await coll.updateOne(
      { _id: doc._id },
      { $set: { receivedAt: doc.confirmedAt } }
    );
    updated++;
  }
}

console.log(`Updated ${updated} records with receivedAt.`);
await mongoose.disconnect();
