import mongoose from 'mongoose';

await mongoose.connect('mongodb://127.0.0.1:27017/blood_donation_db');
const coll = mongoose.connection.db.collection('bloodrequests');
const counts = await coll.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray();
console.log('STATUS COUNTS:', counts);

const query = {
  $or: [
    { confirmedReceived: true },
    { status: 'FULFILLED' },
    { status: 'TRANSFUSED' },
    { status: 'RECEIVED' },
  ],
};
const docs = await coll.find(query).toArray();
console.log('RECORDS FOUND:', docs.length);
for (const r of docs) {
  console.log({
    id: r._id.toString(),
    patientName: r.patientName,
    status: r.status,
    confirmedReceived: r.confirmedReceived,
    confirmedAt: r.confirmedAt,
    receivedAt: r.receivedAt,
    transfusedAt: r.transfusedAt,
    hospital: r.hospital?.toString(),
  });
}
await mongoose.disconnect();
