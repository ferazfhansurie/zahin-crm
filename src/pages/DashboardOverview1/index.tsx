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
import { useNavigate } from "react-router-dom";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, ChartData, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement } from 'chart.js';
import { BarChart } from "lucide-react";
import { useContacts } from "@/contact";
import { User, ChevronRight } from 'lucide-react';
import { format, subDays, subMonths, startOfDay, endOfDay, eachHourOfInterval, eachDayOfInterval } from 'date-fns';


// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement);

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

    console.log(`Updated monthly assignments for employee ${employeeName}`);
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
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [totalContacts, setTotalContacts] = useState(initialContacts.length);
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

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => 
      employee.name.toLowerCase().includes(employeeSearchQuery.toLowerCase())
    );
  }, [employees, employeeSearchQuery]);

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
      console.log('Total Appointments:', totalAppointments);
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
        console.log('No such document for user!');
        return;
      }
      const dataUser = docUserSnapshot.data();
      if (!dataUser) {
        console.log('User document exists but has no data!');
        return;
      }
  
      companyId = dataUser.companyId;
      role = dataUser.role;
  
      if (!companyId) {
        console.log('No company ID found for user!');
        return;
      }
  
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const data = docSnapshot.data();
      if (!data) {
        console.log('Company document exists but has no data!');
        return;
      }
  
      // Fetch the number of contacts with replies
      const contactsRef = collection(firestore, 'companies', companyId, 'contacts');
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
      console.log('Contacts with replies:', contactsWithReplies);
  
    } catch (error) {
      console.error('Error fetching config:', error);
      throw error;
    }
  }

  
  useEffect(() => {
    fetchCompanyData();
  }, []);

  async function fetchCompanyData() {
    const user = auth.currentUser;
 
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
     
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

    
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
 

      // Assuming refreshAccessToken is defined elsewhere
      console.log(companyData);


    } catch (error) {
      console.error('Error fetching company data:', error);
    }

  }

  async function fetchEmployees() {
    const auth = getAuth(app);
    const user = auth.currentUser;
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        return;
      }
    
      const dataUser = docUserSnapshot.data();
      companyId = dataUser.companyId;
  
      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);
  
      const employeeListData: Employee[] = [];
      employeeSnapshot.forEach((doc) => {
        const employeeData = doc.data() as Employee;
        employeeListData.push({
          ...employeeData,
          id: doc.id,
          assignedContacts: employeeData.assignedContacts || 0
        });
      });

      // Find current user
      const currentUserData = employeeListData.find(emp => emp.email === user?.email);
      if (currentUserData) {
        setCurrentUser(currentUserData);
        setSelectedEmployee(currentUserData);
      }

      // Sort employees by number of assigned contacts (descending order)
      employeeListData.sort((a, b) => (b.assignedContacts || 0) - (a.assignedContacts || 0));

      // Take top 10 employees for the leaderboard
      const topEmployees = employeeListData;
      
      setEmployees(topEmployees);
    
    } catch (error) {
      console.error('Error fetching employees and chats:', error);
    }
  }

  async function fetchEmployeeData(employeeId: string): Promise<Employee | null> {
    try {
      const employeeRef = doc(firestore, `companies/${companyId}/employee/${employeeId}`);
      const employeeSnapshot = await getDoc(employeeRef);
  
      if (employeeSnapshot.exists()) {
        const employeeData = employeeSnapshot.data() as Employee;
        
        // Fetch monthly assignments
        const monthlyAssignmentsRef = collection(employeeRef, 'monthlyAssignments');
        const monthlyAssignmentsSnapshot = await getDocs(monthlyAssignmentsRef);
        
        const monthlyAssignments: { [key: string]: number } = {};
        monthlyAssignmentsSnapshot.forEach((doc) => {
          monthlyAssignments[doc.id] = doc.data().assignments;
        });
  
        // Fetch closed contacts
        const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
        const contactsSnapshot = await getDocs(contactsRef);
        
        const closedContacts = contactsSnapshot.docs.filter(doc => {
          const tags = doc.data().tags || [];
          return tags.includes('closed') && tags.includes(employeeData.name);
        }).length;
  
        return {
          ...employeeData,
          id: employeeSnapshot.id,
          monthlyAssignments: monthlyAssignments,
          closedContacts: closedContacts
        };
      } else {
        console.log('No such employee!');
        return null;
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      return null;
    }
  }

  // Add this useEffect to log the selected employee
  useEffect(() => {
    if (selectedEmployee) {
      console.log("Selected Employee:", selectedEmployee);
      console.log("Monthly Assignments:", selectedEmployee.monthlyAssignments);
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
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      last12Months.unshift({
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        assignments: monthlyAssignments[monthKey] || 0
      });
    }
    return last12Months;
  };

  // Update the chartData useMemo with logging
  const chartData = useMemo(() => {
    if (!selectedEmployee) return null;
    const last12MonthsData = getLast12MonthsData(selectedEmployee.monthlyAssignments);
    console.log("Chart data calculated:", last12MonthsData);
    return {
      labels: last12MonthsData.map(d => `${d.month} ${d.year}`),
      datasets: [
        {
          label: 'Assigned Contacts',
          data: last12MonthsData.map(d => d.assignments),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
          fill: false
        },
        {
          label: 'Closed Contacts',
          data: Array(12).fill(selectedEmployee.closedContacts || 0),
          borderColor: 'rgb(255, 99, 132)',
          tension: 0.1,
          fill: false
        }
      ]
    };
  }, [selectedEmployee, selectedEmployee?.monthlyAssignments]);

  const lineChartOptions = useMemo(() => {
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
        },
        title: {
          display: true,
          text: `Contact Metrics for ${selectedEmployee?.name || 'Employee'}`,
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
    console.log("Employee selected:", employee);
    const fullEmployeeData = await fetchEmployeeData(employee.id);
    if (fullEmployeeData) {
      setSelectedEmployee(fullEmployeeData);
    }
  };

  const fetchContactsOverTime = async (filter: 'today' | '7days' | '1month' | '3months' | 'all') => {
    if (!companyId) {
        console.error('CompanyId is not set. Unable to fetch contacts data.');
        return;
    }

    const now = new Date();
    let startDate: Date;

    let interval: 'hour' | 'day' | 'month';


    try {
        const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
        const contactsSnapshot = await getDocs(contactsRef);
        
        let firstContactDate = now;
        const contactsData: { [date: string]: number } = {};
        
        contactsSnapshot.forEach((doc) => {
          const contactData = doc.data();
          const dateAdded = contactData.dateAdded ? new Date(contactData.dateAdded) : null;
  
          if (dateAdded) {
            if (dateAdded < firstContactDate) {
              firstContactDate = dateAdded;
            }
          }
        });
  
        switch (filter) {
          case 'today':
            startDate = startOfDay(now);
            interval = 'hour';
            break;
          case '7days':
          case '1month':
            startDate = filter === '7days' ? subDays(now, 7) : subDays(now, 30);
            interval = 'day';
            break;
          case '3months':
            startDate = subMonths(now, 3);
            interval = 'month';
            break;
          default: // 'all'
            startDate = firstContactDate;
            interval = 'month';
            break;
        }
  

        contactsSnapshot.forEach((doc) => {
          const contactData = doc.data();
          const dateAdded = contactData.dateAdded ? new Date(contactData.dateAdded) : null;
  

          if (dateAdded && dateAdded >= startDate && dateAdded <= now) {
            const dateKey = interval === 'hour' 
              ? format(dateAdded, 'yyyy-MM-dd HH:00')
              : format(dateAdded, 'yyyy-MM-dd');
              contactsData[dateKey] = (contactsData[dateKey] || 0) + 1;
            }
          });
            

          let timePoints: Date[];
          if (interval === 'hour') {
            timePoints = eachHourOfInterval({ start: startOfDay(now), end: endOfDay(now) });
          } else {
            timePoints = eachDayOfInterval({ start: startDate, end: now });
          }

          const sortedData = timePoints.map(date => {
            const dateKey = interval === 'hour'
              ? format(date, 'yyyy-MM-dd HH:00')
              : format(date, 'yyyy-MM-dd');
            return { 
              date: interval === 'hour' ? format(date, 'HH:mm') : format(date, 'MMM dd'),
              count: contactsData[dateKey] || 0 
            };
          });    

        setContactsOverTime(sortedData);
    } catch (error) {
        console.error('Error fetching contacts over time data:', error);
    }
};

// Helper function to get the earliest contact added date
const getEarliestContactDate = async () => {
    const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
    const contactsSnapshot = await getDocs(contactsRef);
    let earliestDate: Date | null = null;

    contactsSnapshot.forEach((doc) => {
        const contactData = doc.data();
        const dateAdded = contactData.dateAdded ? new Date(contactData.dateAdded) : null;

        if (dateAdded) {
            if (!earliestDate || dateAdded < earliestDate) {
                earliestDate = dateAdded;
            }
        }
    });

    return earliestDate;
};

  useEffect(() => {
    if (companyId) {
      fetchContactsOverTime(contactsTimeFilter);
    }
  }, [companyId, contactsTimeFilter]);

  const totalContactsChartData = useMemo(() => {
    return {
      labels: contactsOverTime.map(d => d.date),
      datasets: [{
        label: 'Total Contacts',
        data: contactsOverTime.map(d => d.count),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        fill: false
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
            text: contactsTimeFilter === 'today' ? 'Hour' : 'Date',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            maxTicksLimit: contactsTimeFilter === 'today' ? 24 : 10, // Show all hours for 'today', limit to 10 for other filters
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
    } as const;
  }, [contactsOverTime, contactsTimeFilter]);

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

  const dashboardCards = [
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
    // {
    //   id: 'leads',
    //   title: 'Leads Overview',
    //   content: [
    //     { label: "Total", value: totalContacts },
    //     { label: "Today", value: todayContacts },
    //     { label: "This Week", value: weekContacts },
    //     { label: "This Month", value: monthContacts },
    //   ]
    // },
    {
      id: 'contacts-over-time',
      title: 'Contacts Over Time',
      content: totalContactsChartData,
      filter: contactsTimeFilter,
      setFilter: setContactsTimeFilter
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
    // Add more cards here as needed
  ];

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
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{card.title}</h3>
                  {card.id === 'contacts-over-time' && (
                    <FormSelect
                      className="w-40"
                      value={card.filter}
                      onChange={(e) => card.setFilter?.(e.target.value as 'today' | '7days' | '1month' | '3months' | 'all')}
                    >
                      <option value="today">Today</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="1month">Last Month</option>
                      <option value="3months">Last 3 Months</option>
                      <option value="all">All Time</option>
                    </FormSelect>
                  )}
                </div>
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
                        <Line data={card.content} options={totalContactsChartOptions} />
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
                  ) : (
                    <div className="text-center text-gray-600 dark:text-gray-400">No data available</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Main;