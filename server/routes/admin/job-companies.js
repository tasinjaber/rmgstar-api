const express = require('express');
const router = express.Router();
const JobCompany = require('../../models/JobCompany');
const { slugify } = require('../../utils/slugify');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const companies = await JobCompany.find(query).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, data: { companies } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch companies', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.name) return res.status(400).json({ success: false, message: 'Company name is required' });
    const company = await JobCompany.create(data);
    res.status(201).json({ success: true, message: 'Company created', data: { company } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create company', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const company = await JobCompany.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, message: 'Company updated', data: { company } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update company', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const company = await JobCompany.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, message: 'Company deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete company', error: error.message });
  }
});

module.exports = router;


