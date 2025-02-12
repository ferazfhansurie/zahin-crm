import _ from "lodash";
import clsx from "clsx";
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState, useMemo, useCallback } from "react";
import Button from "@/components/Base/Button";
import Pagination from "@/components/Base/Pagination";
import { FormInput, FormSelect } from "@/components/Base/Form";
import TinySlider, { TinySliderElement } from "@/components/Base/TinySlider";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import Litepicker from "@/components/Base/Litepicker";
import ReportDonutChart from "@/components/ReportDonutChart";
import ReportLineChart from "@/components/ReportLineChart";
import ReportPieChart from "@/components/ReportPieChart";
import ReportDonutChart1 from "@/components/ReportDonutChart1";
import SimpleLineChart1 from "@/components/SimpleLineChart1";
import LeafletMap from "@/components/LeafletMap";
import { Menu } from "@/components/Base/Headless";
import Table from "@/components/Base/Table";
import axios from 'axios';
import { getFirebaseToken, messaging } from "../../firebaseconfig";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { DocumentData, DocumentReference, getDoc,where, query, limit,getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getFirestore, collection, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { onMessage } from "firebase/messaging";
import { Link, useNavigate } from "react-router-dom";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, ChartData, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, BarController } from 'chart.js';
import { BarChart } from "lucide-react";
import { useContacts } from "@/contact";
import { User, ChevronRight } from 'lucide-react';
import { format, subDays, subMonths, startOfDay, endOfDay, eachHourOfInterval, eachDayOfInterval,  parse,  } from 'date-fns';


// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, BarController);

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

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

export const updateMonthlyAssignments = async (employeeName: string, incrementValue: number) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return;
    }

    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.error('No such document for user!');
      return;
    }
    const userData = docUserSnapshot.data();
    const companyId = userData.companyId;

    // Check if the employee exists
    const employeeRef = doc(firestore, 'companies', companyId, 'employee', employeeName);
    const employeeDoc = await getDoc(employeeRef);

    if (!employeeDoc.exists()) {
      console.error(`Employee ${employeeName} does not exist`);
      return;
    }

    const currentDate = new Date();
    const currentMonthKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;

    // Update existing employee document
    await updateDoc(employeeRef, {
      assignedContacts: increment(incrementValue)
    });

    // Update or create the monthly assignment document
    const monthlyAssignmentRef = doc(employeeRef, 'monthlyAssignments', currentMonthKey);
    await setDoc(monthlyAssignmentRef, {
      assignments: increment(incrementValue),
      lastUpdated: serverTimestamp()
    }, { merge: true });

    
  } catch (error) {
    console.error('Error updating monthly assignments:', error);
  }
};

let companyId = "";
let total_contacts = 0;
let role = 2;

function EmployeeSearch({ 
  employees,
  onSelect,
  currentUser
}: {
  employees: Array<{ id: string; name: string; assignedContacts?: number }>;
  onSelect: (employee: { id: string; name: string; assignedContacts?: number }) => void;
  currentUser: { id: string } | null;
}) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => 
      employee.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: { target: Node | null; }) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside as EventListener);
    return () => document.removeEventListener("mousedown", handleClickOutside as EventListener);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <FormInput
        type="text"
        placeholder="Search employees..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="w-full"
      />
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                employee.id === currentUser?.id ? 'bg-blue-100 dark:bg-blue-900' : ''
              }`}
              onClick={() => {
                onSelect(employee);
                setIsOpen(false);
                setSearchQuery(employee.name);
              }}
            >
              <span className="text-gray-900 dark:text-gray-100">{employee.name}</span>
              <span className="text-gray-600 dark:text-gray-400"> ({employee.assignedContacts || 0} assigned contacts)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Add this before the Main function
interface DashboardCard {
  id: string;
  title: string;
  content: any;
  filter?: string;
  setFilter?: (value: any) => void;
  filterControls?: React.ReactNode;
}

function Main() {

  interface Contact {
    additionalEmails: string[];
    address1: string | null;
    assignedTo: string | null;
    businessId: string | null;
    city: string | null;
    companyName: string | null;
    contactName: string;
    country: string;
    customFields: any[];
    dateAdded: string;
    dateOfBirth: string | null;
    dateUpdated: string;
    dnd: boolean;
    dndSettings: any;
    email: string | null;
    firstName: string;
    followers: string[];
    id: string;
    lastName: string;
    locationId: string;
    phone: string | null;
    postalCode: string | null;
    source: string | null;
    state: string | null;
    tags: string[];
    type: string;
    website: string | null;
  
  }

  interface Employee {
    id: string;
    name: string;
    role: string;
    uid: string;
    email: string;
    assignedContacts: number;
    company: string;
    companyId: string;
    phoneNumber: string;
    monthlyAssignments?: { [key: string]: number };
    closedContacts?: number;
  }
  interface Appointment {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    address: string;
    appointmentStatus: string;
    staff: string[];
    tags: Tag[];
    color: string;
    packageId: string | null;
    dateAdded: string;
    contacts: { id: string, name: string, session: number }[];
  }

interface Tag {
  id: string;
  name: string;
}
  const importantNotesRef = useRef<TinySliderElement>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { contacts: initialContacts} = useContacts();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [closed, setClosed] = useState(0);
  const [unclosed, setUnclosed] = useState(0);
  const [numReplies, setReplies] = useState(0);
  const [abandoned, setAbandoned] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [contactsOverTime, setContactsOverTime] = useState<{ date: string; count: number }[]>([]);
  const [contactsTimeFilter, setContactsTimeFilter] = useState<'today' | '7days' | '1month' | '3months' | 'all'>('7days');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [totalAppointments, setTotalAppointments] = useState(0);
  // Add these new state variables
  const [responseRate, setResponseRate] = useState(0);
  const [averageRepliesPerLead, setAverageRepliesPerLead] = useState(0);
  const [engagementScore, setEngagementScore] = useState(0);
  // Add this new state variable for the search query
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [monthlyTokens, setMonthlyTokens] = useState<number>(0);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(0);
  const [hubspotLeads, setHubspotLeads] = useState<number>(0);
  const [hubspotLeadsHistory, setHubspotLeadsHistory] = useState<{ date: string; count: number }[]>([]);
  const [monthlySpendData, setMonthlySpendData] = useState<{ labels: string[], datasets: any[] }>({ labels: [], datasets: [] });
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => 
      employee.name.toLowerCase().includes(employeeSearchQuery.toLowerCase())
    );
  }, [employees, employeeSearchQuery]);
  useEffect(() => {
    fetchMonthlyTokens();
  }, []);

  const fetchMonthlyTokens = async () => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('User document does not exist');
        return;
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;

      // Fetch all usage documents for the company
      const usageCollectionRef = collection(firestore, 'companies', companyId, 'usage');
      const usageSnapshot = await getDocs(usageCollectionRef);

      const labels: string[] = [];
      const data: number[] = [];

      usageSnapshot.forEach(doc => {
        const usageData = doc.data();
        const tokens = usageData.total_tokens || 0;
        const price = (tokens / 1000) * 0.003;

        
        
        

        labels.push(doc.id); // Assuming doc.id is in the format 'YYYY-MM'
        data.push(price);
      });

      
      

      if (labels.length === 0) {
        console.warn('No usage data available');
      }

      setMonthlySpendData({
        labels,
        datasets: [
          {
            label: 'Monthly Spend',
            data,
            backgroundColor: '#82ca9d',
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching monthly tokens:', error);
    }
  };


  const calculateMonthlyPrice = (tokens: number) => {
    const price = (tokens / 1000) * 0.003;
    
    setMonthlyPrice(price);
  };


  useEffect(() => {
    fetchCompanyData();
    fetchEmployees();
  }, []);
  async function fetchAppointments() {
    try {
      let totalAppointments = 0;

      for (const employee of employees) {
        const userRef = doc(firestore, 'user', employee.email);
        const appointmentsCollectionRef = collection(userRef, 'appointments');

        // Fetch all appointments for this employee
        const querySnapshot = await getDocs(appointmentsCollectionRef);
        totalAppointments += querySnapshot.size;
      }

      setTotalAppointments(totalAppointments);
      
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  }
  // Add a new useEffect to fetch appointments after employees are loaded
  useEffect(() => {
    if (employees.length > 0) {
      fetchAppointments();
    }
  }, [employees]);
  const filteredNotifications = notifications.filter((notification) => {
    return (
      notification.from_name.toLowerCase().includes(searchQuery) ||
      (notification.text && notification.text.body.toLowerCase().includes(searchQuery))
    );
  });

  const saveTokenToFirestore = async (userId: string, token: string) => {
    try {
      await setDoc(doc(firestore, "user", userId), {
        fcmToken: token
      }, { merge: true });
      
    } catch (error) {
      console.error('Error saving token to Firestore:', error);
    }
  };

  const handleGetFirebaseToken = (userId: string) => {
    getFirebaseToken().then(async (firebaseToken: string | undefined) => {
      if (firebaseToken) {
        
        await saveTokenToFirestore(userId, firebaseToken);
      }
    });
  };


  useEffect(() => {
    fetchConfigFromDatabase();

    const unsubscribe = onSnapshot(doc(firestore, "user", auth.currentUser?.email!), (doc) => {
      const data = doc.data();
      if (data?.notifications) {
        setNotifications(data.notifications);
      }
    });

    const unsubscribeMessage = onMessage(messaging, (payload) => {
      
      setNotifications((prevNotifications) => [
        ...prevNotifications,
        payload.notification,
      ]);
    });

    return () => {
      unsubscribe();
      unsubscribeMessage();
    };
  }, []);

  async function fetchConfigFromDatabase() {
    const user = auth.currentUser;
  
    if (!user) {
      console.error("No user is currently authenticated.");
      return;
    }
  
    const userEmail = user.email;
  
    if (!userEmail) {
      console.error("Authenticated user has no email.");
      return;
    }
  
    try {
      const docUserRef = doc(firestore, 'user', userEmail);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        
        return;
      }
      const dataUser = docUserSnapshot.data();
      if (!dataUser) {
        
        return;
      }
  
      setCompanyId(dataUser.companyId);
      role = dataUser.role;
  
      if (!dataUser.companyId) {
        
        return;
      }
  
      const docRef = doc(firestore, 'companies', dataUser.companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        
        return;
      }
      const data = docSnapshot.data();
      if (!data) {
        
        return;
      }
  
      // Fetch the number of contacts with replies
      const contactsRef = collection(firestore, 'companies', dataUser.companyId, 'contacts');
      const contactsSnapshot = await getDocs(contactsRef);
      
      let contactsWithReplies = 0;
  
      const checkRepliesPromises = contactsSnapshot.docs.map(async (contactDoc) => {
        const contactData = contactDoc.data();
        // Skip if it's a group
        if (contactData.type === 'group') {
          return false;
        }
  
        const messagesRef = collection(contactDoc.ref, 'messages');
        const q = query(messagesRef, where('id', '>=', ''), limit(1));
        const messageSnapshot = await getDocs(q);
        
        return !messageSnapshot.empty;
      });
  
      const results = await Promise.all(checkRepliesPromises);
      contactsWithReplies = results.filter(Boolean).length;
  
      setReplies(contactsWithReplies);
      
  
    } catch (error) {
      console.error('Error fetching config:', error);
      throw error;
    }
  }

  
  useEffect(() => {
    fetchCompanyData();
  }, []);

  const [companyId, setCompanyId] = useState<string>('');

  async function fetchCompanyData() {
    const user = auth.currentUser;
 
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        return;
      }
     
      const userData = docUserSnapshot.data();
      const fetchedCompanyId = userData.companyId;
      setCompanyId(fetchedCompanyId);

      const docRef = doc(firestore, 'companies', fetchedCompanyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        return;
      }
      const companyData = docSnapshot.data();
    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  }

  async function fetchEmployees() {
    const auth = getAuth(app);
    const user = auth.currentUser;
    try {
      // Get current user's company ID from state
      if (!companyId) {
        console.error('Company ID not set');
        return;
      }

      // Get all employees
      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);

      // Get all contacts
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsRef);

      // Create a map to count contacts per employee
      const contactCountMap: { [key: string]: number } = {};

      // Count contacts based on tags matching employee names
      contactsSnapshot.forEach((doc) => {
        const contactData = doc.data();
        if (contactData.tags && Array.isArray(contactData.tags)) {
          contactData.tags.forEach((tag: string) => {
            if (contactCountMap[tag]) {
              contactCountMap[tag]++;
            } else {
              contactCountMap[tag] = 1;
            }
          });
        }
      });

      // Process employee data
      const employeeListData: Employee[] = [];
      employeeSnapshot.forEach((doc) => {
        const employeeData = doc.data() as Employee;
        employeeListData.push({
          ...employeeData,
          id: doc.id,
          assignedContacts: contactCountMap[employeeData.name] || 0
        });

        // Update the employee document with the correct count
        updateDoc(doc.ref, {
          assignedContacts: contactCountMap[employeeData.name] || 0
        });
      });

      // Find current user
      const currentUserData = employeeListData.find(emp => emp.email === user?.email);
      if (currentUserData) {
        setCurrentUser(currentUserData);
        setSelectedEmployee(currentUserData);
      }

      // Sort employees by number of assigned contacts (descending)
      employeeListData.sort((a, b) => (b.assignedContacts || 0) - (a.assignedContacts || 0));

      setEmployees(employeeListData);
      

    } catch (error) {
      console.error('Error fetching employees and contacts:', error);
    }
  }

  async function fetchEmployeeData(employeeId: string): Promise<Employee | null> {
    try {
      const employeeRef = doc(firestore, `companies/${companyId}/employee/${employeeId}`);
      const employeeSnapshot = await getDoc(employeeRef);

      if (employeeSnapshot.exists()) {
        const employeeData = employeeSnapshot.data() as Employee;
        
        // Fetch all contacts
        const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
        const contactsSnapshot = await getDocs(contactsRef);
        
        // Create a timeline of assignments
        const assignmentTimeline: { date: Date; count: number }[] = [];
        
        contactsSnapshot.docs.forEach((doc) => {
          const contactData = doc.data();
          if (contactData.tags?.includes(employeeData.name)) {
            const assignmentDate = contactData.dateAdded ? new Date(contactData.dateAdded) : null;
            if (assignmentDate) {
              assignmentTimeline.push({
                date: assignmentDate,
                count: 1
              });
            }
          }
        });

        // Sort timeline by date
        assignmentTimeline.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Calculate cumulative totals by month
        const monthlyAssignments: { [key: string]: number } = {};
        let runningTotal = 0;

        assignmentTimeline.forEach((assignment) => {
          const monthKey = format(assignment.date, 'yyyy-MM');
          runningTotal += assignment.count;
          monthlyAssignments[monthKey] = runningTotal;
        });

        // Count current closed contacts
        const closedContacts = contactsSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.tags?.includes('closed') && data.tags?.includes(employeeData.name);
        }).length;

        return {
          ...employeeData,
          id: employeeSnapshot.id,
          monthlyAssignments,
          closedContacts
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching employee data:', error);
      return null;
    }
  }

  // Add this useEffect to log the selected employee
  useEffect(() => {
    if (selectedEmployee) {
      
      
    }
  }, [selectedEmployee]);

  // Modify the existing useEffect for selectedEmployee
  useEffect(() => {
    if (selectedEmployee) {
      const employeeRef = doc(firestore, `companies/${companyId}/employee/${selectedEmployee.id}`);
      const monthlyAssignmentsRef = collection(employeeRef, 'monthlyAssignments');
      
      const unsubscribe = onSnapshot(monthlyAssignmentsRef, (snapshot) => {
        const updatedMonthlyAssignments: { [key: string]: number } = {};
        snapshot.forEach((doc) => {
          updatedMonthlyAssignments[doc.id] = doc.data().assignments;
        });
        
        setSelectedEmployee(prevState => ({
          ...prevState!,
          monthlyAssignments: updatedMonthlyAssignments
        }));
      });

      return () => unsubscribe();
    }
  }, [selectedEmployee?.id, companyId]);
  
  // Usage in your component
  useEffect(() => {
    async function loadEmployeeData() {
      if (currentUser) {
        const employeeData = await fetchEmployeeData(currentUser.uid);
        if (employeeData) {
          setSelectedEmployee(employeeData);
        }
      }
    }
  
    if (currentUser) {
      loadEmployeeData();
    }
  }, [currentUser]);

  const getLast12MonthsData = (monthlyAssignments: { [key: string]: number } = {}) => {
    const last12Months = [];
    const currentDate = new Date();
    let lastKnownTotal = 0;

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = format(date, 'yyyy-MM');
      
      // Use the last known total if no new assignments in this month
      const monthTotal = monthlyAssignments[monthKey] || lastKnownTotal;
      lastKnownTotal = monthTotal;

      last12Months.push({
        month: format(date, 'MMM'),
        year: date.getFullYear(),
        assignments: monthTotal
      });
    }
    
    return last12Months;
  };

  const chartData = useMemo(() => {
    if (!selectedEmployee) return null;

    const last12Months = getLast12MonthsData(selectedEmployee.monthlyAssignments);
     // Debug log
    
    return {
      labels: last12Months.map(d => `${d.month} ${d.year}`),
      datasets: [
        {
          label: 'Total Assigned Contacts',
          data: last12Months.map(d => d.assignments),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.1,
          fill: true
        }
      ]
    };
  }, [selectedEmployee]);

  const lineChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Total Assigned Contacts',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            stepSize: 1,
          },
        },
        x: {
          title: {
            display: true,
            text: 'Month',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            label: function(context: any) {
              return `Total Assigned: ${context.parsed.y}`;
            }
          }
        },
        title: {
          display: true,
          text: `Contact Assignment History - ${selectedEmployee?.name || 'Employee'}`,
          color: 'rgb(31, 41, 55)',
        },
      },
    } as const;
  }, [selectedEmployee]);

  // Add these new state variables
  const [closedContacts, setClosedContacts] = useState(0);
  const [openContacts, setOpenContacts] = useState(0);
  const [todayContacts, setTodayContacts] = useState(0);
  const [weekContacts, setWeekContacts] = useState(0);
  const [monthContacts, setMonthContacts] = useState(0);

  // Update this function
  async function fetchContactsData() {
    if (!companyId) {
      console.error('CompanyId is not set. Unable to fetch contacts data.');
      return;
    }
    try {
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsRef);
      
      let total = 0;
      let closed = 0;
      let today = 0;
      let week = 0;
      let month = 0;

      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      contactsSnapshot.forEach((doc) => {
        const contactData = doc.data();
        const dateAdded = contactData.dateAdded ? new Date(contactData.dateAdded) : null;

        total++;
        if (contactData.tags && contactData.tags.includes('closed')) {
          closed++;
        }

        if (dateAdded) {
          if (dateAdded >= startOfDay) {
            today++;
          }
          if (dateAdded >= startOfWeek) {
            week++;
          }
          if (dateAdded >= startOfMonth) {
            month++;
          }
        }
      });

      const open = total - closed;

      // Log the contacts data
      console.log('Contacts Data:', {
        totalContacts: total,
        closedContacts: closed,
        openContacts: open,
        todayContacts: today,
        weekContacts: week,
        monthContacts: month,
        numReplies: numReplies,
      });

      setTotalContacts(total);
      setClosedContacts(closed);
      setOpenContacts(open);
      setTodayContacts(today);
      setWeekContacts(week);
      setMonthContacts(month);
    } catch (error) {
      console.error('Error fetching contacts data:', error);
    }
  }

  // Add this function to calculate additional stats
  const calculateAdditionalStats = useCallback(() => {
    // Response Rate (percentage of contacts that have replied)
    const newResponseRate = totalContacts > 0 ? (numReplies / totalContacts) * 100 : 0;
    setResponseRate(Number(newResponseRate.toFixed(1))); // Use 1 decimal place for percentage
  
    // Average Replies per Lead
   // const newAverageRepliesPerLead = totalContacts > 0 ? numReplies / totalContacts : 0;
   // setAverageRepliesPerLead(Number(newAverageRepliesPerLead.toFixed(2))); // Use 2 decimal places
    const newBookAppointmentsRate = totalContacts > 0 ? (totalAppointments / totalContacts) * 100 : 0;
    setAverageRepliesPerLead(Number(newBookAppointmentsRate.toFixed(2)));
 // Engagement Score (weighted sum of response rate and booking appointments rate)
  // Adjust weights as needed; the sum should be 1 for better scaling
  const responseWeight = 0.15; // weight for response rate
  const appointmentWeight = 0.35; // weight for booking appointments rate
  const closedContactsWeight = 0.5;
  const newClosedContactsRate = totalContacts > 0 ? (closedContacts / totalContacts) * 100 : 0;

  const newEngagementScore = (newResponseRate * responseWeight) + 
  (newBookAppointmentsRate * appointmentWeight) + 
  (newClosedContactsRate * closedContactsWeight);

setEngagementScore(Number(newEngagementScore.toFixed(2)));
  }, [numReplies, totalContacts, totalAppointments]);

  // Update useEffect to call calculateAdditionalStats
  useEffect(() => {
    if (companyId) {
      fetchContactsData();
      calculateAdditionalStats();
      fetchClosedContactsByEmployee();
    }
  }, [companyId, calculateAdditionalStats]);

  // Modify the handleEmployeeSelect function
  const handleEmployeeSelect = async (employee: Employee) => {
    
    setSelectedEmployee(employee);
    fetchEmployeeStats(employee.id);
  };

  // Add new state for tag filter
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Add function to fetch available tags
  const fetchAvailableTags = async () => {
    if (!companyId) return;
    
    try {
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsRef);
      
      const tagsSet = new Set<string>();
      contactsSnapshot.forEach((doc) => {
        const contactData = doc.data();
        if (contactData.tags && Array.isArray(contactData.tags)) {
          contactData.tags.forEach((tag: string) => tagsSet.add(tag));
        }
      });
      
      setAvailableTags(Array.from(tagsSet).sort());
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  // Modify the existing fetchContactsOverTime function
  const fetchContactsOverTime = async (filter: 'today' | '7days' | '1month' | '3months' | 'all') => {
    if (!companyId) {
      console.error('CompanyId is not set. Unable to fetch contacts data.');
      return;
    }

    try {
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsRef);
      
      const now = new Date();
      let startDate: Date;

      // Set the start date based on the filter
      switch (filter) {
        case 'today':
          startDate = startOfDay(now);
          break;
        case '7days':
          startDate = subDays(now, 7);
          break;
        case '1month':
          startDate = subDays(now, 30);
          break;
        case '3months':
          startDate = subMonths(now, 3);
          break;
        default: // 'all'
          startDate = subMonths(now, 12);
          break;
      }

      const contactCounts: { [key: string]: number } = {};

      // Count contacts by date, considering the tag filter
      contactsSnapshot.forEach((doc) => {
        const contactData = doc.data();
        
        if (doc.id.startsWith('+') && contactData.createdAt) {
          // Check if the contact has the selected tag (if a tag is selected)
          if (selectedTag !== 'all' && (!contactData.tags || !contactData.tags.includes(selectedTag))) {
            return;
          }

          const createdAt = contactData.createdAt.toDate ? 
            contactData.createdAt.toDate() : 
            new Date(contactData.createdAt);
          
          if (createdAt >= startDate) {
            let dateKey;
            if (filter === 'today') {
              dateKey = format(createdAt, 'HH:00');
            } else if (filter === 'all') {
              // For "all time" view, group by month
              dateKey = format(createdAt, 'yyyy-MM');
            } else {
              dateKey = format(createdAt, 'yyyy-MM-dd');
            }
            
            contactCounts[dateKey] = (contactCounts[dateKey] || 0) + 1;
          }
        }
      });

      let timePoints: Date[];
      if (filter === 'today') {
        timePoints = eachHourOfInterval({ start: startDate, end: now });
      } else if (filter === 'all') {
        // For "all time" view, create array of months
        timePoints = [];
        let currentDate = startDate;
        while (currentDate <= now) {
          timePoints.push(currentDate);
          currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        }
      } else {
        timePoints = eachDayOfInterval({ start: startDate, end: now });
      }

      let runningTotal = 0;
      const sortedData = timePoints.map(date => {
        const dateKey = filter === 'today'
          ? format(date, 'HH:00')
          : filter === 'all'
            ? format(date, 'yyyy-MM')
            : format(date, 'yyyy-MM-dd');
        
        runningTotal += contactCounts[dateKey] || 0;
        
        return {
          date: filter === 'today'
            ? format(date, 'HH:mm')
            : filter === 'all'
              ? format(date, 'MMM yyyy')
              : format(date, 'MMM dd'),
          count: runningTotal
        };
      });

      setContactsOverTime(sortedData);

    } catch (error) {
      console.error('Error fetching contacts over time data:', error);
    }
  };

  // Add useEffect to fetch tags when component mounts
  useEffect(() => {
    fetchAvailableTags();
  }, [companyId]);

  // Modify the existing useEffect to include selectedTag dependency
  useEffect(() => {
    if (companyId) {
      fetchContactsOverTime(contactsTimeFilter);
    }
  }, [companyId, contactsTimeFilter, selectedTag]); // Add selectedTag as dependency

  const totalContactsChartData = useMemo(() => {
    return {
      labels: contactsOverTime.map(d => d.date),
      datasets: [{
        label: 'Total Contacts',
        data: contactsOverTime.map(d => d.count),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    };
  }, [contactsOverTime]);

  const totalContactsChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          title: {
            display: true,
            text: 'Number of Contacts',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            stepSize: Math.max(1, Math.ceil(Math.max(...contactsOverTime.map(d => d.count)) / 10)),
          },
        },
        x: {
          title: {
            display: true,
            text: contactsTimeFilter === 'today' ? 'Hour' : 
                  contactsTimeFilter === 'all' ? 'Month' : 'Date',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            maxTicksLimit: contactsTimeFilter === 'today' ? 24 : 
                          contactsTimeFilter === 'all' ? undefined : 10,
            autoSkip: true,
            maxRotation: 45,
            minRotation: 45
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: 'Total Contacts Over Time',
          color: 'rgb(31, 41, 55)',
        },
      },
      barPercentage: 0.9,
      categoryPercentage: 0.9,
      onClick: (event: any, elements: any[]) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const label = contactsOverTime[index].date;
          setSelectedPeriodLabel(label);
          
          // Calculate period start and end based on the filter
          let periodStart: Date;
          let periodEnd: Date;
          
          if (contactsTimeFilter === 'today') {
            // For hourly view
            const [hours] = label.split(':');
            periodStart = new Date();
            periodStart.setHours(parseInt(hours), 0, 0, 0);
            periodEnd = new Date(periodStart);
            periodEnd.setHours(periodStart.getHours() + 1);
          } else if (contactsTimeFilter === 'all') {
            // For monthly view
            const [month, year] = label.split(' ');
            periodStart = new Date(parseInt(year), new Date(Date.parse(`${month} 1, ${year}`)).getMonth(), 1);
            periodEnd = new Date(periodStart);
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          } else {
            // For daily view
            periodStart = parse(label, 'MMM dd', new Date());
            periodEnd = new Date(periodStart);
            periodEnd.setDate(periodEnd.getDate() + 1);
          }
          
          fetchContactsForPeriod(periodStart, periodEnd);
        }
      },
    } as const;
  }, [contactsOverTime, contactsTimeFilter, selectedTag]);

  const [closedContactsByEmployee, setClosedContactsByEmployee] = useState<{ [key: string]: number }>({});

  async function fetchClosedContactsByEmployee() {
    if (!companyId) {
      console.error('CompanyId is not set. Unable to fetch closed contacts data.');
      return;
    }
    try {
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsRef);
      
      const closedContacts: { [key: string]: number } = {};

      contactsSnapshot.forEach((doc) => {
        const contactData = doc.data();
        if (contactData.tags && contactData.tags.includes('closed') && contactData.assignedTo) {
          closedContacts[contactData.assignedTo] = (closedContacts[contactData.assignedTo] || 0) + 1;
        }
      });

      setClosedContactsByEmployee(closedContacts);
    } catch (error) {
      console.error('Error fetching closed contacts data:', error);
    }
  }

  const closedContactsChartData = useMemo(() => {
    if (!employees || !closedContactsByEmployee) return null;

    const labels = employees.map(emp => emp.name);
    const data = employees.map(emp => closedContactsByEmployee[emp.id] || 0);

    return {
      labels: labels,
      datasets: [{
        label: 'Closed Contacts',
        data: data,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    };
  }, [employees, closedContactsByEmployee]);

  const closedContactsChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Closed Contacts',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            stepSize: 1,
          },
        },
        x: {
          title: {
            display: true,
            text: 'Employees',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: 'Closed Contacts by Employee',
          color: 'rgb(31, 41, 55)',
        },
      },
    } as const;
  }, []);

  // Add these new state variables near the top of your component
  const [blastMessageData, setBlastMessageData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
    }[];
  }>({
    labels: [],
    datasets: []
  });

  // Add this new function to fetch blast message data
  const fetchBlastMessageData = async () => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('User document does not exist');
        return;
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;

      // Fetch scheduled messages collection
      const scheduledMessagesRef = collection(firestore, 'companies', companyId, 'scheduledMessages');
      const scheduledMessagesSnapshot = await getDocs(scheduledMessagesRef);

      const monthlyData: { [key: string]: { scheduled: number; completed: number; failed: number } } = {};

      scheduledMessagesSnapshot.forEach(doc => {
        const messageData = doc.data();
        const scheduledTime = messageData.scheduledTime?.toDate() || new Date(messageData.scheduledTime);
        const monthKey = format(scheduledTime, 'MMM yyyy');
        const status = messageData.status;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { scheduled: 0, completed: 0, failed: 0 };
        }

        // Count messages based on their status
        if (status === 'completed') {
          monthlyData[monthKey].completed++;
        } else if (status === 'failed') {
          monthlyData[monthKey].failed++;
        }
        monthlyData[monthKey].scheduled++; // Count all messages as scheduled
      });

      const labels = Object.keys(monthlyData).sort((a, b) => {
        return new Date(a).getTime() - new Date(b).getTime();
      });
      const scheduledData = labels.map(key => monthlyData[key].scheduled);
      const completedData = labels.map(key => monthlyData[key].completed);
      const failedData = labels.map(key => monthlyData[key].failed);

      setBlastMessageData({
        labels,
        datasets: [
          {
            label: 'Scheduled',
            data: scheduledData,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
          },
          {
            label: 'Completed',
            data: completedData,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
          },
          {
            label: 'Failed',
            data: failedData,
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
          },
        ],
      });

    } catch (error) {
      console.error('Error fetching scheduled messages data:', error);
    }
  };

  // Add useEffect to fetch blast message data
  useEffect(() => {
    fetchBlastMessageData();
  }, []);

  // Add this new interface
  interface EmployeeStats {
    conversationsAssigned: number;
    outgoingMessagesSent: number;
    averageResponseTime: number;
    closedContacts: number;
  }

  // Add this new state
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);

  // Add this new function
  const fetchEmployeeStats = async (employeeId: string) => {
    try {
      
      const user = getAuth().currentUser;
      if (!user) {
        console.error("User not authenticated");
        setError("User not authenticated");
        return;
      }
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        
        return;
      }
      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        
        return;
      }
      const data2 = docSnapshot.data();
      const baseUrl = data2.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      // Update the URL to match your actual API endpoint
      const response = await axios.get(`${baseUrl}/api/stats/${companyId}?employeeId=${employeeId}`);
      
      setEmployeeStats(response.data);
    } catch (error) {
      console.error('Error fetching employee stats:', error);
      // Add user-friendly error handling
      setEmployeeStats(null);
      // Optionally show an error message to the user
      // setError('Failed to load employee performance metrics');
    }
  };

  // Update useEffect to fetch stats for current user by default
  useEffect(() => {
    if (currentUser) {
      fetchEmployeeStats(currentUser.id);
      setSelectedEmployee(currentUser);
    }
  }, [currentUser]); // Dependency on currentUser

  // Add this new type near your other interfaces
  interface PerformanceMetricsData {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      fill: boolean;
    }[];
  }

  // Inside your Main component, add this new function
  const getPerformanceMetricsData = (stats: EmployeeStats | null): PerformanceMetricsData => {
    return {
      labels: ['Response Time (min)', 'Closed Contacts', 'Conversations', 'Messages Sent'],
      datasets: [
        {
          label: 'Performance Metrics',
          data: [
            stats?.averageResponseTime ? Number((stats.averageResponseTime / 60).toFixed(1)) : 0,
            stats?.closedContacts || 0,
            stats?.conversationsAssigned || 0,
            stats?.outgoingMessagesSent || 0
          ],
          borderColor: 'rgb(147, 51, 234)', // purple for response time
          backgroundColor: 'rgba(147, 51, 234, 0.2)',
          fill: true
        }
      ]
    };
  };

  // Add this new function to fetch Hubspot leads data
  const fetchHubspotLeads = async () => {
    if (!companyId) return;
    
    try {
      console.log('Fetching Hubspot leads for company:', companyId);
      
      // Get the hubspot collection
      const hubspotRef = collection(firestore, 'companies', companyId, 'hubspot');
      const hubspotSnapshot = await getDocs(hubspotRef);

      const leadsHistory: { date: string; count: number }[] = [];
      let totalLeads = 0;

      console.log('Found Hubspot documents:', hubspotSnapshot.size);

      hubspotSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Processing document:', { id: doc.id, data });
        
        // Only add valid data
        if (doc.id && typeof data.count === 'number') {
          leadsHistory.push({
            date: doc.id,
            count: data.count
          });
          totalLeads += data.count; // Add each count to the total
        }
      });

      // Sort by date
      leadsHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      console.log('Setting Hubspot data:', { totalLeads, leadsHistory });

      setHubspotLeads(totalLeads);
      setHubspotLeadsHistory(leadsHistory);
    } catch (error) {
      console.error('Error fetching Hubspot leads:', error);
      setError('Failed to load Hubspot leads data');
    }
  };

  // Remove the separate useEffect for Hubspot leads
  useEffect(() => {
    if (companyId === '042') {
      fetchHubspotLeads();
    }
  }, [companyId]);

  // Update the notifications useEffect
  useEffect(() => {
    if (!auth.currentUser?.email) return;

    const unsubscribeNotifications = onSnapshot(
      doc(firestore, "user", auth.currentUser.email), 
      (doc) => {
        const data = doc.data();
        if (data?.notifications) {
          setNotifications(data.notifications);
        }
      },
      (error) => {
        console.error('Error fetching notifications:', error);
      }
    );

    const unsubscribeMessage = onMessage(messaging, (payload) => {
      setNotifications((prevNotifications) => [
        ...prevNotifications,
        payload.notification,
      ]);
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeMessage();
    };
  }, []);

  // Add new interfaces and states
  interface Contact {
    id: string;
    contactName: string;
    email: string | null;
    phone: string | null;
    dateAdded: string;
    tags: string[];
    // Add other contact fields as needed
  }

  // Add these new states
  const [selectedPeriodContacts, setSelectedPeriodContacts] = useState<Contact[]>([]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedPeriodLabel, setSelectedPeriodLabel] = useState<string>('');

  // Add the function to fetch contacts for a specific period
  const fetchContactsForPeriod = async (periodStart: Date, periodEnd: Date) => {
    try {
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsRef);
      
      const periodContacts: Contact[] = [];
      
      contactsSnapshot.forEach((doc) => {
        const contactData = doc.data();
        
        if (doc.id.startsWith('+') && contactData.createdAt) {
          const createdAt = contactData.createdAt.toDate ? 
            contactData.createdAt.toDate() : 
            new Date(contactData.createdAt);
          
          if (createdAt >= periodStart && createdAt < periodEnd) {
            if (selectedTag === 'all' || (contactData.tags && contactData.tags.includes(selectedTag))) {
              periodContacts.push({
                id: doc.id,
                additionalEmails: contactData.additionalEmails || [],
                address1: contactData.address1 || null,
                assignedTo: contactData.assignedTo || null,
                businessId: contactData.businessId || null,
                city: contactData.city || null,
                companyName: contactData.companyName || null,
                contactName: contactData.contactName || '',
                country: contactData.country || '',
                customFields: contactData.customFields || [],
                dateAdded: format(createdAt, 'MMM dd, yyyy HH:mm'),
                dateOfBirth: contactData.dateOfBirth || null,
                dateUpdated: contactData.dateUpdated || '',
                dnd: contactData.dnd || false,
                dndSettings: contactData.dndSettings || {},
                email: contactData.email || null,
                firstName: contactData.firstName || '',
                followers: contactData.followers || [],
                lastName: contactData.lastName || '',
                locationId: contactData.locationId || '',
                phone: contactData.phone || null,
                postalCode: contactData.postalCode || null,
                source: contactData.source || null,
                state: contactData.state || null,
                tags: contactData.tags || [],
                type: contactData.type || '',
                website: contactData.website || null
              });
            }
          }
        }
      });
      
      // Sort contacts by date added
      periodContacts.sort((a, b) => 
        new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
      );
      
      setSelectedPeriodContacts(periodContacts);
      setIsContactModalOpen(true);
    } catch (error) {
      console.error('Error fetching contacts for period:', error);
    }
  };

  // Add the ContactsModal component
  const ContactsModal = ({ 
    isOpen, 
    onClose, 
    contacts, 
    periodLabel 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    contacts: Contact[]; 
    periodLabel: string; 
  }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Contacts for {periodLabel} ({contacts.length} contacts)
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Lucide icon="X" className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 overflow-auto max-h-[calc(80vh-8rem)]">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Company</th>
                  <th className="text-left p-2">Date Added</th>
                  <th className="text-left p-2">Tags</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b dark:border-gray-700">
                    <td className="p-2">{`${contact.firstName} ${contact.lastName}`}</td>
                    <td className="p-2">{contact.email || '-'}</td>
                    <td className="p-2">{contact.phone || '-'}</td>
                    <td className="p-2">{contact.companyName || '-'}</td>
                    <td className="p-2">{contact.dateAdded}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((tag, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Add these new interfaces and state
  interface DailyAssignment {
    date: string;
    count: number;
  }

  interface EmployeeAssignments {
    [employeeId: string]: {
      daily: DailyAssignment[];
      total: number;
    };
  }

  const [assignmentsData, setAssignmentsData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
    }[];
    dailyData: EmployeeAssignments;
  }>({
    labels: [],
    datasets: [],
    dailyData: {}
  });

  // Update the fetchAssignmentsData function
  const fetchAssignmentsData = async () => {
    try {
      if (companyId !== '072') return;

      const assignmentsRef = collection(firestore, 'companies', '072', 'assignments');
      const assignmentsSnapshot = await getDocs(assignmentsRef);

      const employeeAssignments: EmployeeAssignments = {};

      assignmentsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.assigned && data.timestamp) {
          const date = format(data.timestamp.toDate(), 'yyyy-MM-dd');
          
          if (!employeeAssignments[data.assigned]) {
            employeeAssignments[data.assigned] = {
              daily: [],
              total: 0
            };
          }

          const existingDayIndex = employeeAssignments[data.assigned].daily.findIndex(
            d => d.date === date
          );

          if (existingDayIndex >= 0) {
            employeeAssignments[data.assigned].daily[existingDayIndex].count++;
          } else {
            employeeAssignments[data.assigned].daily.push({ date, count: 1 });
          }
          employeeAssignments[data.assigned].total++;
        }
      });

      // Sort daily data for each employee
      Object.values(employeeAssignments).forEach(employee => {
        employee.daily.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      });

      const labels = Object.keys(employeeAssignments);
      const data = labels.map(label => employeeAssignments[label].total);

      setAssignmentsData({
        labels,
        datasets: [{
          label: 'Total Assignments',
          data,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
        }],
        dailyData: employeeAssignments
      });

    } catch (error) {
      console.error('Error fetching assignments data:', error);
    }
  };

  // Add this new function to fetch assignments data
  const dashboardCards: DashboardCard[] = [
    {
      id: 'kpi',
      title: 'Key Performance Indicators',
      content: [
        { icon: "Contact", label: "Total Contacts", value: totalContacts },
        { icon: "MessageCircleReply", label: "Number Replies", value: numReplies },
        { icon: "Check", label: "Closed Contacts", value: closedContacts },
        { icon: "Mail", label: "Open Contacts", value: openContacts },
      ]
    },
    {
      id: 'engagement-metrics',
      title: 'Engagement Metrics',
      content: [
        { label: "Response Rate", value: `${responseRate}%` },
        { label: "Book Appointments Rate", value: `${averageRepliesPerLead}%` },
        { label: "Engagement Score", value: engagementScore },
        { label: "Conversion Rate", value: `${closedContacts > 0 ? ((closedContacts / totalContacts) * 100).toFixed(2) : 0}%` },
      ],
    },
    {
      id: 'contacts-over-time',
      title: 'Contacts Over Time',
      content: totalContactsChartData,
      filter: contactsTimeFilter,
      setFilter: setContactsTimeFilter,
      filterControls: (
        <div className="flex gap-2">
          <FormSelect
            className="w-40"
            value={contactsTimeFilter}
            onChange={(e) => setContactsTimeFilter(e.target.value as 'today' | '7days' | '1month' | '3months' | 'all')}
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="1month">Last Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="all">All Time</option>
          </FormSelect>
          <FormSelect
            className="w-40"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            <option value="all">All Tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </FormSelect>
        </div>
      )
    },
    {
      id: 'employee-assignments',
      title: 'Employee Metrics',
      content: { 
        employees, 
        filteredEmployees, 
        chartData, 
        lineChartOptions, 
        currentUser, 
        selectedEmployee, 
        handleEmployeeSelect,
        closedContactsChartData,
        closedContactsChartOptions
      }
    },
    ...(companyId === '042' ? [{
      id: 'hubspot-leads',
      title: 'Hubspot Leads',
      content: (
        <div className="h-full">
          <div className="mb-4 text-center">
            <div className="text-3xl font-bold text-blue-500 dark:text-blue-400">
              {loading ? (
                <LoadingIcon icon="spinning-circles" className="w-8 h-8 mx-auto" />
              ) : (
                hubspotLeads
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Hubspot Leads
            </div>
          </div>
          <div className="h-64">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <LoadingIcon icon="spinning-circles" className="w-8 h-8" />
              </div>
            ) : hubspotLeadsHistory && hubspotLeadsHistory.length > 0 ? (
              <Line
                data={{
                  labels: hubspotLeadsHistory.map(item => format(new Date(item.date), 'MMM dd, yyyy')),
                  datasets: [{
                    label: 'Hubspot Leads',
                    data: hubspotLeadsHistory.map(item => item.count),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.1,
                    fill: true
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Number of Leads',
                        color: 'rgb(75, 85, 99)',
                      },
                      ticks: {
                        color: 'rgb(107, 114, 128)',
                        stepSize: 1,
                      },
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Date',
                        color: 'rgb(75, 85, 99)',
                      },
                      ticks: {
                        color: 'rgb(107, 114, 128)',
                        maxRotation: 45,
                        minRotation: 45
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      mode: 'index' as const,
                      intersect: false,
                      callbacks: {
                        title: (tooltipItems) => {
                          const date = new Date(hubspotLeadsHistory[tooltipItems[0].dataIndex].date);
                          return format(date, 'MMMM dd, yyyy');
                        },
                        label: (context) => {
                          return `Leads: ${context.parsed.y}`;
                        }
                      }
                    },
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No Hubspot leads data available
              </div>
            )}
          </div>
          {hubspotLeadsHistory && hubspotLeadsHistory.length > 0 && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>First Record:</span>
                <span>{format(new Date(hubspotLeadsHistory[0].date), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span>Latest Record:</span>
                <span>{format(new Date(hubspotLeadsHistory[hubspotLeadsHistory.length - 1].date), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          )}
        </div>
      )
    }] : []),
    {
      id: 'blast-messages',
      title: 'Scheduled Messages Analytics',
      content: (
        <div className="h-full flex flex-col">
          {blastMessageData.labels.length > 0 ? (
            <Bar 
              data={blastMessageData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Number of Messages',
                    },
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Month',
                    },
                  },
                },
                plugins: {
                  title: {
                    display: true,
                    text: 'Monthly Scheduled Message Statistics',
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                  },
                },
              }} 
            />
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-400">No scheduled message data available</p>
          )}
          <div className="mt-4">
            {blastMessageData.labels.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Scheduled:</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    {blastMessageData.datasets[0].data.reduce((a, b) => a + b, 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Completed:</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    {blastMessageData.datasets[1].data.reduce((a, b) => a + b, 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Failed:</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    {blastMessageData.datasets[2].data.reduce((a, b) => a + b, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'performance-metrics',
      title: 'Employee Performance Metrics',
      content: (
        <div className="h-full">
          {employeeStats ? (
            <Bar
              data={getPerformanceMetricsData(employeeStats)}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // This makes it a horizontal bar chart
                scales: {
                  x: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(107, 114, 128, 0.1)'
                    },
                    ticks: {
                      color: 'rgb(107, 114, 128)'
                    }
                  },
                  y: {
                    grid: {
                      display: false
                    },
                    ticks: {
                      color: 'rgb(107, 114, 128)'
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: false
                  },
                  // title: {
                  //   display: true,
                  //   text: 'Employee Performance Metrics',
                  //   color: 'rgb(31, 41, 55)',
                  //   font: {
                  //     size: 16
                  //   }
                  // },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.x;
                        const metric = context.label;
                        
                        if (metric === 'Response Time (min)') {
                          return `${label}: ${value} minutes`;
                        }
                        return `${label}: ${value}`;
                      }
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No performance data available
            </div>
          )}
        </div>
      ),
    },
    // Inside your dashboardCards array, add this conditional card
    ...(companyId === '072' ? [{
      id: 'assignments-chart',
      title: 'Assignments by Employee',
      content: (
        <div className="h-[500px]"> {/* Fixed height */}
          <div className="h-[300px]"> {/* Chart height */}
            {assignmentsData.labels.length > 0 ? (
              <Bar 
                data={assignmentsData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Number of Assignments',
                      },
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Employee',
                      },
                    },
                  },
                  plugins: {
                    title: {
                      display: true,
                      text: 'Assignments Distribution',
                    },
                    tooltip: {
                      callbacks: {
                        afterBody: (tooltipItems) => {
                          const employeeId = assignmentsData.labels[tooltipItems[0].dataIndex];
                          const employeeData = assignmentsData.dailyData[employeeId];
                          if (!employeeData) return '';

                          // Show last 5 days of assignments
                          const recentAssignments = employeeData.daily.slice(-5);
                          return '\nRecent daily assignments:\n' + 
                            recentAssignments.map(day => 
                              `${format(new Date(day.date), 'MMM dd')}: ${day.count} assignments`
                            ).join('\n');
                        }
                      }
                    },
                  },
                }} 
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No assignments data available
              </div>
            )}
          </div>
          
          {/* Daily breakdown table */}
          <div className="mt-4 h-[160px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-800">
                <tr>
                  <th className="text-left p-2">Employee</th>
                  <th className="text-left p-2">Total</th>
                  <th className="text-left p-2">Last 5 Days</th>
                </tr>
              </thead>
              <tbody>
                {assignmentsData.labels.map(employeeId => {
                  const employeeData = assignmentsData.dailyData[employeeId];
                  const recentAssignments = employeeData.daily.slice(-5);
                  
                  return (
                    <tr key={employeeId} className="border-t dark:border-gray-700">
                      <td className="p-2">{employeeId}</td>
                      <td className="p-2">{employeeData.total}</td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          {recentAssignments.map(day => (
                            <div key={day.date} className="text-xs">
                              <div>{format(new Date(day.date), 'MM/dd')}</div>
                              <div className="font-semibold">{day.count}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )
    }] : []),
    // Add more cards here as needed
  ];

  // Add this new function to handle contact assignment
  const assignContactToEmployee = async (contactId: string, employeeName: string) => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      // Get the contact document
      const contactRef = doc(firestore, 'companies', companyId, 'contacts', contactId);
      const contactSnapshot = await getDoc(contactRef);
      
      if (!contactSnapshot.exists()) {
        console.error('Contact does not exist');
        return;
      }

      const contactData = contactSnapshot.data();
      const currentTags = contactData.tags || [];

      // Check if the employee name is already in tags
      if (!currentTags.includes(employeeName)) {
        // Add the employee name to the tags array
        await updateDoc(contactRef, {
          tags: [...currentTags, employeeName]
        });

        // Update the employee's assigned contacts count
        const employeeRef = doc(firestore, 'companies', companyId, 'employee', employeeName);
        await updateDoc(employeeRef, {
          assignedContacts: increment(1)
        });

        // Update monthly assignments
        await updateMonthlyAssignments(employeeName, 1);

        
      }

    } catch (error) {
      console.error('Error assigning contact:', error);
    }
  };

  // Add this function to remove assignment
  const removeContactAssignment = async (contactId: string, employeeName: string) => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      // Get the contact document
      const contactRef = doc(firestore, 'companies', companyId, 'contacts', contactId);
      const contactSnapshot = await getDoc(contactRef);
      
      if (!contactSnapshot.exists()) {
        console.error('Contact does not exist');
        return;
      }

      const contactData = contactSnapshot.data();
      const currentTags = contactData.tags || [];

      // Remove the employee name from tags
      if (currentTags.includes(employeeName)) {
        await updateDoc(contactRef, {
          tags: currentTags.filter((tag: string) => tag !== employeeName)
        });

        // Update the employee's assigned contacts count
        const employeeRef = doc(firestore, 'companies', companyId, 'employee', employeeName);
        await updateDoc(employeeRef, {
          assignedContacts: increment(-1)
        });

        // Update monthly assignments
        await updateMonthlyAssignments(employeeName, -1);

        
      }

    } catch (error) {
      console.error('Error removing contact assignment:', error);
    }
  };

  // Example usage:
  // To assign a contact:
  // await assignContactToEmployee("contactId123", "John Doe");

  // To remove an assignment:
  // await removeContactAssignment("contactId123", "John Doe");

  const handleAssignContact = async (contactId: string, employeeName: string) => {
    await assignContactToEmployee(contactId, employeeName);
    // Refresh the employee list or update the UI as needed
    await fetchEmployees();
  };

  const handleUnassignContact = async (contactId: string, employeeName: string) => {
    await removeContactAssignment(contactId, employeeName);
    // Refresh the employee list or update the UI as needed
    await fetchEmployees();
  };

  // Make sure to call fetchEmployees after companyId is set
  useEffect(() => {
    if (companyId) {
      fetchEmployees();
    }
  }, [companyId]);

  // Add useEffect to fetch Hubspot leads when companyId changes
  useEffect(() => {
    console.log('CompanyId changed:', companyId);
    if (companyId === '042') {
      console.log('Calling fetchHubspotLeads for company 042');
      fetchHubspotLeads();
    }
  }, [companyId]);

  // Add monitoring for Hubspot data changes
  useEffect(() => {
    console.log('Hubspot data updated:', {
      hubspotLeads,
      hubspotLeadsHistory,
      hasHistory: hubspotLeadsHistory.length > 0
    });
  }, [hubspotLeads, hubspotLeadsHistory]);

  // Add this near the top of the component
  const [isInitialized, setIsInitialized] = useState(false);

  // Update the initialization useEffect
  useEffect(() => {
    let isMounted = true;
    let unsubscribeUser: (() => void) | null = null;

    const initializeDashboard = async () => {
      if (!auth.currentUser?.email) return;
      
      try {
        setLoading(true);
        // Get user data first
        const docUserRef = doc(firestore, 'user', auth.currentUser.email);
        unsubscribeUser = onSnapshot(docUserRef, async (docSnapshot) => {
          if (!isMounted) return;
          
          if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            const fetchedCompanyId = userData.companyId;
            setCompanyId(fetchedCompanyId);
            
            // Only fetch other data after we have the company ID
            if (fetchedCompanyId) {
              await Promise.all([
                fetchEmployees(),
                fetchContactsData(),
                fetchBlastMessageData()
              ]);

              // Fetch company-specific data
              if (fetchedCompanyId === '042') {
                await fetchHubspotLeads();
              }
              if (fetchedCompanyId === '072') {
                await fetchAssignmentsData();
              }
            }
          }
        });
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        setError('Failed to load dashboard data');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeDashboard();

    // Cleanup function
    return () => {
      isMounted = false;
      if (unsubscribeUser) {
        unsubscribeUser();
      }
    };
  }, []);

  return (
    <div className="flex flex-col w-full h-full overflow-x-hidden overflow-y-auto">
      <div className="flex-grow p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {dashboardCards.map((card) => (
            <div 
              key={card.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-full"
            >
              <div className="p-6 flex-grow flex flex-col">
                {card.id === 'contacts-over-time' && (
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{card.title}</h3>
                    {card.filterControls}
                  </div>
                )}
                {card.id !== 'contacts-over-time' && (
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{card.title}</h3>
                )}
                <div className="flex-grow">
                  {card.id === 'kpi' || card.id === 'leads' || card.id === 'engagement-metrics' ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Array.isArray(card.content) && card.content.map((item, index) => (
                        <div key={index} className="text-center">
                          <div className="text-3xl font-bold text-blue-500 dark:text-blue-400">
                            {!loading ? item.value : <LoadingIcon icon="spinning-circles" className="w-8 h-8 mx-auto" />}
                          </div>
                          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  ) : card.id === 'contacts-over-time' ? (
                    <div className="h-full">
                      {('datasets' in card.content) && (
                        <Bar data={card.content} options={totalContactsChartOptions} />
                      )}
                    </div>
                  ) : card.id === 'hubspot-leads' ? (
                    <div className="h-full">
                      <div className="mb-4 text-center">
                        <div className="text-3xl font-bold text-blue-500 dark:text-blue-400">
                          {loading ? (
                            <LoadingIcon icon="spinning-circles" className="w-8 h-8 mx-auto" />
                          ) : (
                            hubspotLeads
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Total Hubspot Leads
                        </div>
                      </div>
                      <div className="h-64">
                        {loading ? (
                          <div className="flex items-center justify-center h-full">
                            <LoadingIcon icon="spinning-circles" className="w-8 h-8" />
                          </div>
                        ) : hubspotLeadsHistory && hubspotLeadsHistory.length > 0 ? (
                          <Line
                            data={{
                              labels: hubspotLeadsHistory.map(item => format(new Date(item.date), 'MMM dd, yyyy')),
                              datasets: [{
                                label: 'Hubspot Leads',
                                data: hubspotLeadsHistory.map(item => item.count),
                                borderColor: 'rgb(59, 130, 246)',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                tension: 0.1,
                                fill: true
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: {
                                y: {
                                  beginAtZero: true,
                                  title: {
                                    display: true,
                                    text: 'Number of Leads',
                                    color: 'rgb(75, 85, 99)',
                                  },
                                  ticks: {
                                    color: 'rgb(107, 114, 128)',
                                    stepSize: 1,
                                  },
                                },
                                x: {
                                  title: {
                                    display: true,
                                    text: 'Date',
                                    color: 'rgb(75, 85, 99)',
                                  },
                                  ticks: {
                                    color: 'rgb(107, 114, 128)',
                                    maxRotation: 45,
                                    minRotation: 45
                                  },
                                },
                              },
                              plugins: {
                                legend: {
                                  display: false,
                                },
                                tooltip: {
                                  mode: 'index' as const,
                                  intersect: false,
                                  callbacks: {
                                    title: (tooltipItems) => {
                                      const date = new Date(hubspotLeadsHistory[tooltipItems[0].dataIndex].date);
                                      return format(date, 'MMMM dd, yyyy');
                                    },
                                    label: (context) => {
                                      return `Leads: ${context.parsed.y}`;
                                    }
                                  }
                                },
                              },
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            No Hubspot leads data available
                          </div>
                        )}
                      </div>
                      {hubspotLeadsHistory && hubspotLeadsHistory.length > 0 && (
                        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex justify-between">
                            <span>First Record:</span>
                            <span>{format(new Date(hubspotLeadsHistory[0].date), 'MMM dd, yyyy')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Latest Record:</span>
                            <span>{format(new Date(hubspotLeadsHistory[hubspotLeadsHistory.length - 1].date), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : card.id === 'employee-assignments' ? (
                    <div>
                      <div className="mb-4">
                        <EmployeeSearch 
                          employees={employees}
                          onSelect={(employee: { id: string; name: string; assignedContacts?: number | undefined; }) => handleEmployeeSelect(employee as Employee)}
                          currentUser={currentUser}
                        />
                      </div>
                      <div className="h-64">
                        {selectedEmployee ? (
                          chartData ? (
                            <Line data={chartData} options={lineChartOptions} />
                          ) : (
                            <div className="text-center text-gray-600 dark:text-gray-400">No data available for this employee</div>
                          )
                        ) : (
                          <div className="text-center text-gray-600 dark:text-gray-400">Select an employee to view their chart</div>
                        )}
                      </div>
                    </div>
                  ) : card.id === 'blast-messages' ? (
                    <div>
                    <div className="mb-4">
                    <Link to="blast-history">
                      <Button variant="primary" className="mr-2 shadow-md">
                          Blast History
                      </Button>
                    </Link>
                    </div>
                    <div className="h-64">
                      {blastMessageData.labels.length > 0 ? (
                        <Bar 
                          data={blastMessageData} 
                          options={{ 
                            responsive: true, 
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: 'Number of Messages',
                                },
                              },
                              x: {
                                title: {
                                  display: true,
                                  text: 'Month',
                                },
                              },
                            },
                            plugins: {
                              title: {
                                display: true,
                                text: 'Monthly Scheduled Message Statistics',
                              },
                              tooltip: {
                                mode: 'index',
                                intersect: false,
                              },
                            },
                          }} 
                        />
                      ) : (
                        <div className="text-center text-gray-600 dark:text-gray-400">No scheduled message data available</div>
                      )}
                    </div>
                    <div className="mt-4">
                      {blastMessageData.labels.length > 0 && (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Scheduled:</p>
                            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                              {blastMessageData.datasets[0].data.reduce((a, b) => a + b, 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Completed:</p>
                            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                              {blastMessageData.datasets[1].data.reduce((a, b) => a + b, 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Failed:</p>
                            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                              {blastMessageData.datasets[2].data.reduce((a, b) => a + b, 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  ) : card.id === 'performance-metrics' ? (
                    <div className="h-full">
                      {employeeStats ? (
                        <Bar
                          data={getPerformanceMetricsData(employeeStats)}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            indexAxis: 'y', // This makes it a horizontal bar chart
                            scales: {
                              x: {
                                beginAtZero: true,
                                grid: {
                                  color: 'rgba(107, 114, 128, 0.1)'
                                },
                                ticks: {
                                  color: 'rgb(107, 114, 128)'
                                }
                              },
                              y: {
                                grid: {
                                  display: false
                                },
                                ticks: {
                                  color: 'rgb(107, 114, 128)'
                                }
                              }
                            },
                            plugins: {
                              legend: {
                                display: false
                              },
                              // title: {
                              //   display: true,
                              //   text: 'Employee Performance Metrics',
                              //   color: 'rgb(31, 41, 55)',
                              //   font: {
                              //     size: 16
                              //   }
                              // },
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.parsed.x;
                                    const metric = context.label;
                                    
                                    if (metric === 'Response Time (min)') {
                                      return `${label}: ${value} minutes`;
                                    }
                                    return `${label}: ${value}`;
                                  }
                                }
                              }
                            }
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          No performance data available
                        </div>
                      )}
                    </div>
                  ) : card.id === 'assignments-chart' ? (
                    <div className="h-full">
                      {assignmentsData.labels.length > 0 ? (
                        <Bar 
                          data={assignmentsData} 
                          options={{ 
                            responsive: true, 
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: 'Number of Assignments',
                                },
                              },
                              x: {
                                title: {
                                  display: true,
                                  text: 'Employee',
                                },
                              },
                            },
                            plugins: {
                              title: {
                                display: true,
                                text: 'Assignments Distribution',
                              },
                              tooltip: {
                                mode: 'index',
                                intersect: false,
                              },
                            },
                          }} 
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          No assignments data available
                        </div>
                      )}
                      
                      {/* Summary statistics */}
                      {assignmentsData.labels.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Assignments:</p>
                            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                              {assignmentsData.datasets[0].data.reduce((a, b) => a + b, 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Assigned Employees:</p>
                            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                              {assignmentsData.labels.length}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-600 dark:text-gray-400">No data available</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <ContactsModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        contacts={selectedPeriodContacts}
        periodLabel={selectedPeriodLabel}
      />
    </div>
  );
}

export default Main;