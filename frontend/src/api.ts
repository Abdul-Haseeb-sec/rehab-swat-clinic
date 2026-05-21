import axiosInstance from './lib/axios';

export const fetchPatients = async () => {
  const res = await axiosInstance.get('/patients');
  return res.data;
};

export const createPatient = async (data: any) => {
  const res = await axiosInstance.post('/patients', data);
  return res.data;
};

export const fetchAppointments = async () => {
  const res = await axiosInstance.get('/appointments');
  return res.data;
};

export const createAppointment = async (data: any) => {
  const res = await axiosInstance.post('/appointments', data);
  return res.data;
};

export const fetchMedicalRecords = async (patientId: string) => {
  const res = await axiosInstance.get(`/medical-records/patient/${patientId}`);
  return res.data;
};

export const createMedicalRecord = async (data: any) => {
  try {
    const res = await axiosInstance.post('/medical-records', data);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || 'Failed to create medical record');
  }
};

export const fetchInvoices = async () => {
  const res = await axiosInstance.get('/invoices');
  return res.data;
};

export const fetchPatientInvoices = async (patientId: string) => {
  const res = await axiosInstance.get(`/invoices/patient/${patientId}`);
  return res.data;
};

export const createInvoice = async (data: any) => {
  try {
    const res = await axiosInstance.post('/invoices', data);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || 'Failed to create invoice');
  }
};

export const recordPayment = async (invoiceId: string, data: any) => {
  try {
    const res = await axiosInstance.post(`/invoices/${invoiceId}/payments`, data);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || 'Failed to record payment');
  }
};

export const fetchPatientPrescriptions = async (patientId: string) => {
  const res = await axiosInstance.get(`/prescriptions/patient/${patientId}`);
  return res.data;
};

export const createPrescription = async (data: any) => {
  try {
    const res = await axiosInstance.post('/prescriptions', data);
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || 'Failed to create prescription');
  }
};
