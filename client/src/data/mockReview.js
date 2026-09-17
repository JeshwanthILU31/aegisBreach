const assignees = ['Saini, Suresh', 'Gupta, Anjali', 'Thakur, Khushboo', 'Kumar, Kashishka', '']

export const mockReview = Array.from({ length: 48 }, (_, index) => ({
  id: `batch-${String(index + 1).padStart(4, '0')}`,
  batchSet: 'Monday Batch1',
  batch: `Monday Batch1_${String(index + 12).padStart(5, '0')}`,
  batchStatus: index % 7 === 0 ? 'Taken' : 'In Progress',
  batchUnit: 'Alternate Workflow 6+ Entries',
  assignedTo: assignees[index % assignees.length],
  reviewed: index % 6 === 0 ? 0 : (index * 3) % 32,
  batchSize: 50,
  takenByOther: index % 7 === 0,
}))
