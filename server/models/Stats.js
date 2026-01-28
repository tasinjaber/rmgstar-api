const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
  totalStudents: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCourses: {
    type: Number,
    default: 0,
    min: 0
  },
  totalBatches: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPartners: {
    type: Number,
    default: 0,
    min: 0
  },
  totalInstructors: {
    type: Number,
    default: 0,
    min: 0
  },
  totalEnrollments: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Only one stats document
statsSchema.statics.getStats = async function() {
  let stats = await this.findOne();
  if (!stats) {
    stats = await this.create({});
  }
  return stats;
};

module.exports = mongoose.model('Stats', statsSchema);

