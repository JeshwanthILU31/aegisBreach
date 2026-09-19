import api from './api'

export const adminApi = {
  getPersonTracker: async (params = {}) => {
    const res = await api.get('/admin/person-tracker', { params })
    return res.data
  },
}

export default adminApi
