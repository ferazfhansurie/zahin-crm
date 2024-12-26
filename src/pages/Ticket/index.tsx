import { useState, useEffect } from 'react';
import { getDoc, getFirestore, doc, setDoc, collection, addDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeApp } from "firebase/app";
import { Dialog } from '@headlessui/react';
import { format } from 'date-fns';
import Lucide from "@/components/Base/Lucide";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
  authDomain: "onboarding-a5fcb.firebaseapp.com",
  databaseURL: "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onboarding-a5fcb",
  storageBucket: "onboarding-a5fcb.appspot.com",
  messagingSenderId: "334607574757",
  appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
  measurementId: "G-2C9J1RY67L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

interface Task {
  id: string;
  title: string;
  deadline: string;
  poc: string;
  clientName: string;
  description: string;
  status: 'open' | 'in-progress' | 'completed' | 'blocked';
  dateCreated: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours: number;
  comments: Array<{
    text: string;
    author: string;
    timestamp: string;
  }>;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role?: string;
  color: string;
  backgroundStyle: string;
}

interface Client {
  id: string;
  name: string;
}

const Ticket = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<Task['status'] | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Task['priority'] | 'all'>('all');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
    fetchClients();
  }, []);

  const fetchTasks = async () => {
    try {
      const user = auth.currentUser;
      if (!user?.email) return;

      const tasksRef = collection(firestore, `user/${user.email}/tasks`);
      const tasksSnapshot = await getDocs(tasksRef);
      
      const tasksData = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];

      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
      const accessToken = companyData.ghl_accessToken;

      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);

      const employeeListData: Employee[] = [];
      const colors = ["#FF5733", "#006400", "#3357FF", "#FF33A1", "#33FFF5", "#FF8C33", "#8C33FF", "#33FF8C"];
      const backgroundStyles = [
        "linear-gradient(to right, #1F3A8A 0%, #1F3A8A 50%, #2196F3 50%, #2196F3 100%)",
        "linear-gradient(to right, #8A2BE2 0%, #8A2BE2 50%, #9C27B0 50%, #9C27B0 100%)",
        "linear-gradient(to right, #00BCD4 0%, #00BCD4 50%, #795548 50%, #795548 100%)",
        "linear-gradient(to right, #607D8B 0%, #607D8B 50%, #E91E63 50%, #E91E63 100%)"
      ];
      let colorIndex = 0;

      employeeSnapshot.forEach((doc) => {
        employeeListData.push({
          id: doc.id,
          ...doc.data(),
          color: colors[colorIndex % colors.length],
          backgroundStyle: backgroundStyles[colorIndex % backgroundStyles.length]
        } as Employee);
        colorIndex++;
      });

      setEmployees(employeeListData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  };

  const fetchClients = async () => {
    try {
      const user = auth.currentUser;
      if (!user?.email) return;

      const clientsRef = collection(firestore, `user/${user.email}/clients`);
      const clientsSnapshot = await getDocs(clientsRef);
      
      const clientsData = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[];

      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500';
      case 'in-progress':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'blocked':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (hideCompleted && task.status === 'completed') {
      return false;
    }

    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'bg-gray-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-5">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold dark:text-white">Task Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsClientFormOpen(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
          >
            <Lucide icon="Users" className="w-4 h-4 mr-2 inline-block" />
            Manage Clients
          </button>
          <button
            onClick={() => {
              setCurrentTask(null);
              setIsTaskFormOpen(true);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
          >
            <Lucide icon="Plus" className="w-4 h-4 mr-2 inline-block" />
            New Task
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-4 items-center flex-wrap">
        <input
          type="text"
          placeholder="Search tasks..."
          className="px-4 py-2 border rounded-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as Task['status'] | 'all')}
          className="px-4 py-2 border rounded-md"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as Task['priority'] | 'all')}
          className="px-4 py-2 border rounded-md"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Hide Completed Tasks</span>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
          <thead>
            <tr>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-left">Title</th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-left">Deadline</th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-left">POC</th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-left">Client</th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-left">Description</th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-left">Status</th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-left">Priority</th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-left">Est. Hours</th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-left">Comments</th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-left">Created</th>
              <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr key={task.id}>
                <td className="border border-gray-300 dark:border-gray-600 p-2">{task.title}</td>
                <td className="border border-gray-300 dark:border-gray-600 p-2">
                  {format(new Date(task.deadline), 'dd/MM/yyyy')}
                </td>
                <td className="border border-gray-300 dark:border-gray-600 p-2">
                  {employees.find(emp => emp.email === task.poc)?.name || task.poc}
                  <div
                    className="w-3 h-3 rounded-full inline-block ml-2"
                    style={{ backgroundColor: employees.find(emp => emp.email === task.poc)?.color }}
                  />
                </td>
                <td className="border border-gray-300 dark:border-gray-600 p-2">{task.clientName}</td>
                <td className="border border-gray-300 dark:border-gray-600 p-2">
                  <div className="max-w-xs overflow-hidden text-ellipsis">{task.description}</div>
                </td>
                <td className="border border-gray-300 dark:border-gray-600 p-2">
                  <span className={`px-2 py-1 rounded-full text-white text-sm ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </td>
                <td className="border border-gray-300 dark:border-gray-600 p-2">
                  <span className={`px-2 py-1 rounded-full text-white text-sm ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </td>
                <td className="border border-gray-300 dark:border-gray-600 p-2">{task.estimatedHours}</td>
                <td className="border border-gray-300 dark:border-gray-600 p-2">
                  {task.comments?.map((comment, index) => (
                    <div key={index} className="text-sm text-gray-500 mb-1">
                      <div className="font-medium">{comment.text}</div>
                      <div className="text-xs">
                        {comment.author} - {new Date(comment.timestamp).toLocaleString()}
                      </div>
                    </div>
                  )) || 'No comments'}
                </td>
                <td className="border border-gray-300 dark:border-gray-600 p-2">
                  {format(new Date(task.dateCreated), 'dd/MM/yyyy HH:mm')}
                </td>
                <td className="border border-gray-300 dark:border-gray-600 p-2">
                  <button
                    onClick={() => {
                      setCurrentTask(task);
                      setIsTaskFormOpen(true);
                    }}
                    className="px-3 py-1 text-sm text-white bg-primary rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TaskFormModal
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        task={currentTask}
        employees={employees}
        clients={clients}
        onSubmit={async (taskData) => {
          try {
            const user = auth.currentUser;
            if (!user?.email) return;

            const tasksRef = collection(firestore, `user/${user.email}/tasks`);
            
            if (currentTask) {
              await updateDoc(doc(tasksRef, currentTask.id), taskData);
            } else {
              await addDoc(tasksRef, {
                ...taskData,
                dateCreated: new Date().toISOString()
              });
            }

            fetchTasks();
            setIsTaskFormOpen(false);
          } catch (error) {
            console.error('Error saving task:', error);
          }
        }}
      />

      <ClientFormModal
        isOpen={isClientFormOpen}
        onClose={() => {
          setIsClientFormOpen(false);
          setEditingClient(null);
        }}
        clients={clients}
        editingClient={editingClient}
        onEdit={setEditingClient}
        onSubmit={async (clientName) => {
          try {
            const user = auth.currentUser;
            if (!user?.email) return;

            const clientsRef = collection(firestore, `user/${user.email}/clients`);
            
            if (editingClient) {
              await updateDoc(doc(clientsRef, editingClient.id), { name: clientName });
            } else {
              await addDoc(clientsRef, { name: clientName });
            }

            fetchClients();
            setEditingClient(null);
          } catch (error) {
            console.error('Error saving client:', error);
          }
        }}
        onDelete={async (clientId) => {
          try {
            const user = auth.currentUser;
            if (!user?.email) return;

            await deleteDoc(doc(firestore, `user/${user.email}/clients`, clientId));
            fetchClients();
          } catch (error) {
            console.error('Error deleting client:', error);
          }
        }}
      />
    </div>
  );
};

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSubmit: (taskData: Omit<Task, 'id'>) => void;
  employees: Employee[];
  clients: Client[];
}

const TaskFormModal = ({ isOpen, onClose, task, onSubmit, employees, clients }: TaskFormModalProps) => {
  const [formData, setFormData] = useState<Omit<Task, 'id'>>({
    title: '',
    deadline: new Date().toISOString().split('T')[0],
    poc: '',
    clientName: '',
    description: '',
    status: 'open',
    dateCreated: new Date().toISOString(),
    priority: 'medium',
    estimatedHours: 0,
    comments: []
  });

  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        deadline: task.deadline,
        poc: task.poc,
        clientName: task.clientName,
        description: task.description,
        status: task.status,
        dateCreated: task.dateCreated,
        priority: task.priority || 'medium',
        estimatedHours: task.estimatedHours || 0,
        comments: task.comments || []
      });
    } else {
      setFormData({
        title: '',
        deadline: new Date().toISOString().split('T')[0],
        poc: '',
        clientName: '',
        description: '',
        status: 'open',
        dateCreated: new Date().toISOString(),
        priority: 'medium',
        estimatedHours: 0,
        comments: []
      });
    }
  }, [task]);

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md dark:bg-gray-800">
          <form onSubmit={(e) => {
            e.preventDefault();
            onSubmit(formData);
          }}>
            <h2 className="text-xl font-bold mb-4 dark:text-white">
              {task ? 'Edit Task' : 'New Task'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deadline</label>
                <input
                  type="date"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  value={formData.deadline.split('T')[0]}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  value={formData.poc}
                  onChange={(e) => setFormData({ ...formData, poc: e.target.value })}
                >
                  <option value="">Select an employee</option>
                  {employees.map((employee) => (
                    <option 
                      key={employee.id} 
                      value={employee.email}
                      style={{ backgroundColor: employee.color + '20' }}
                    >
                      {employee.name} ({employee.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client</label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.name}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estimated Hours</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.5"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) })}
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Comments</label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {formData.comments?.map((comment, index) => (
                    <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="text-sm">{comment.text}</p>
                      <p className="text-xs text-gray-500">
                        {comment.author} - {new Date(comment.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newComment.trim()) {
                        setFormData({
                          ...formData,
                          comments: [
                            ...(formData.comments || []),
                            {
                              text: newComment.trim(),
                              author: auth.currentUser?.email || 'Unknown',
                              timestamp: new Date().toISOString()
                            }
                          ]
                        });
                        setNewComment('');
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
              >
                {task ? 'Update' : 'Create'} Task
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  editingClient: Client | null;
  onEdit: (client: Client) => void;
  onSubmit: (clientName: string) => void;
  onDelete: (clientId: string) => void;
}

const ClientFormModal = ({ 
  isOpen, 
  onClose, 
  clients, 
  editingClient, 
  onEdit, 
  onSubmit, 
  onDelete 
}: ClientFormModalProps) => {
  const [newClientName, setNewClientName] = useState('');

  useEffect(() => {
    if (editingClient) {
      setNewClientName(editingClient.name);
    } else {
      setNewClientName('');
    }
  }, [editingClient]);

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md dark:bg-gray-800">
          <h2 className="text-xl font-bold mb-4 dark:text-white">
            Manage Clients
          </h2>

          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Client name"
                className="flex-1 px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
              <button
                onClick={() => {
                  if (newClientName.trim()) {
                    onSubmit(newClientName.trim());
                    setNewClientName('');
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
              >
                {editingClient ? 'Update' : 'Add'} Client
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded dark:bg-gray-700"
              >
                <span className="dark:text-white">{client.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(client)}
                    className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    <Lucide icon="Pencil" className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(client.id)}
                    className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
                  >
                    <Lucide icon="Trash" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default Ticket;
