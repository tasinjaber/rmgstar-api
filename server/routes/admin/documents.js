const express = require('express');
const router = express.Router();
const Document = require('../../models/Document');
const { slugify } = require('../../utils/slugify');

router.get('/', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Document.countDocuments(query);

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch documents', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const data = req.body || {};
    if (data.title && data.title !== doc.title) {
      const baseSlug = slugify(data.title);
      let slug = baseSlug;
      let counter = 1;
      while (await Document.findOne({ slug, _id: { $ne: doc._id } })) {
        slug = `${baseSlug}-${counter++}`;
      }
      data.slug = slug;
    }

    const updated = await Document.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    res.json({ success: true, message: 'Document updated', data: { document: updated } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update document', error: error.message });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    doc.status = 'published';
    doc.publishDate = doc.publishDate || new Date();
    doc.approvedBy = req.user?._id || null;
    doc.approvedAt = new Date();
    await doc.save();

    res.json({ success: true, message: 'Document approved', data: { document: doc } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve document', error: error.message });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    doc.status = 'rejected';
    doc.approvedBy = req.user?._id || null;
    doc.approvedAt = new Date();
    await doc.save();

    res.json({ success: true, message: 'Document rejected', data: { document: doc } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject document', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete document', error: error.message });
  }
});

module.exports = router;


