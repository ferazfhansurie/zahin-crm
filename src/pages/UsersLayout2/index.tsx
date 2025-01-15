import _ from "lodash";
import fakerData from "@/utils/faker";
import Button from "@/components/Base/Button";
import Pagination from "@/components/Base/Pagination";
import { FormInput, FormSelect } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import { Menu } from "@/components/Base/Headless";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { DocumentReference, updateDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import axios from "axios";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import ReactPaginate from 'react-paginate';
import ThemeSwitcher from "@/components/ThemeSwitcher";


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
let companyId= "014";
let role= "1";
let ghlConfig ={
  ghl_id:'',
  ghl_secret:'',
  ghl_refreshToken:'',
};
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Add these types
interface Bot {
  botName: string;
  phoneCount: number | string;
  name: string;
  clientPhones: (string | null)[];
}

interface Employee {
  id: string;
  name: string;
  role: string;
  group?: string;
  email?: string;
  assignedContacts?: number;
  employeeId?: string;
  phoneNumber?: string;
  phoneNames?: { [key: number]: string };
  imageUrl?: string;
}

function Main() {
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [showAddUserButton, setShowAddUserButton] = useState(false);
  const [contactData, setContactData] = useState<ContactData>({});
  const [response, setResponse] = useState<string>('');
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const [employeeIdToDelete, setEmployeeIdToDelete] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string>("");
  const [phoneCount, setPhoneCount] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 21;

  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [phoneNames, setPhoneNames] = useState<{ [key: number]: string }>({});
  const [companyData, setCompanyData] = useState<any>(null);

  const toggleModal = (id?:string) => {
    setIsModalOpen(!isModalOpen);
    setEmployeeIdToDelete(id!)
  };

  interface ContactData {
    country?: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    address1?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string;
    website?: string | null;
    timezone?: string | null;
    dnd?: boolean;
    dndSettings?: any;
    inboundDndSettings?: any;
    tags?: string[];
    customFields?: any[];
    source?: string | null;
  }
  
  interface Props {
    accessToken: string;
    contactId: string;
  }

  let accessToken = "";
  
 
 useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (user) {
      
      setCurrentUserEmail(user.email);
      fetchEmployees();
    } else {
      
    }
  }, []);

  useEffect(() => {
    const fetchCompanyData = async () => {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (user) {
        const docUserRef = doc(firestore, 'user', user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        
        if (docUserSnapshot.exists()) {
          const userData = docUserSnapshot.data();
          companyId = userData.companyId;
          
          const companyRef = doc(firestore, 'companies', companyId);
          const companySnapshot = await getDoc(companyRef);
          
          if (companySnapshot.exists()) {
            const data = companySnapshot.data();
            setCompanyData(data);
            const phoneCount = data.phoneCount || 0;
            
            // Fetch bot data from API
            try {
              const baseUrl = data.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
              const response = await axios.get(`${baseUrl}/api/bots`);
              const bots: Bot[] = response.data;
              
              // Match bot using companyId (which should match botName)
              const matchingBot = bots.find(bot => bot.botName === companyId);
              
              const newPhoneNames: { [key: number]: string } = {};
              if (matchingBot) {
                // Use clientPhones from API if available
                matchingBot.clientPhones.forEach((phone, index) => {
                  if (phone) {
                    newPhoneNames[index + 1] = phone;
                  } else {
                    newPhoneNames[index + 1] = data[`phone${index + 1}`] || `Phone ${index + 1}`;
                  }
                });
                
                // Update phoneCount based on API data if different
                const apiPhoneCount = typeof matchingBot.phoneCount === 'string' 
                  ? parseInt(matchingBot.phoneCount) 
                  : matchingBot.phoneCount;
                  
                setPhoneCount(apiPhoneCount);
              } else {
                // Fallback to existing data if no matching bot found
                for (let i = 1; i <= phoneCount; i++) {
                  newPhoneNames[i] = data[`phone${i}`] || `Phone ${i}`;
                }
                setPhoneCount(phoneCount);
              }
              
              setPhoneNames(newPhoneNames);
              
              
              
            } catch (error) {
              console.error('Error fetching bot data:', error);
              // Fallback to existing phone names
              const newPhoneNames: { [key: number]: string } = {};
              for (let i = 1; i <= phoneCount; i++) {
                newPhoneNames[i] = data[`phone${i}`] || `Phone ${i}`;
              }
              setPhoneNames(newPhoneNames);
              setPhoneCount(phoneCount);
            }
          }
        }
      }
    };
  
    fetchCompanyData();
  }, []);

  
  async function fetchEmployees() {
    const auth = getAuth(app);
    const user = auth.currentUser;
    setCurrentUserEmail(user?.email || null);
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        return;
      }
    
      const dataUser = docUserSnapshot.data();
      companyId = dataUser.companyId;
      setRole(dataUser.role);
      

      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        return;
      }
      const companyData = docSnapshot.data();
      setPhoneCount(companyData.phoneCount);
      accessToken = companyData.ghl_accessToken;

      // Fetch phone names
      const phoneNamesData: { [key: number]: string } = {};
      for (let i = 1; i <= companyData.phoneCount; i++) {
        if (companyData[`phone${i}Name`]) {
          phoneNamesData[i] = companyData[`phone${i}Name`];
        } else {
          phoneNamesData[i] = `Phone ${i}`;
        }
      }
      setPhoneNames(phoneNamesData);

      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);

      const employeeListData: Employee[] = [];
      const groupSet = new Set<string>();

      employeeSnapshot.forEach((doc) => {
        const data = doc.data();
        const employeeGroup = data.group || '';
        if (employeeGroup) {
          groupSet.add(employeeGroup);
        }
        employeeListData.push({ 
          id: doc.id, 
          ...data,
          group: employeeGroup,
          email: data.email,
          name: data.name,
          employeeId: data.employeeId,
          phoneNumber: data.phoneNumber,
          role: data.role
        } as Employee);
      });

      
      

      const filteredEmployeeList = dataUser.role === "3"
        ? employeeListData.filter(employee => employee.email === user?.email)
        : employeeListData;
      
      
      setEmployeeList(filteredEmployeeList);
      setGroups(Array.from(groupSet));
      
      setShowAddUserButton(dataUser.role === "1");
    
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  }

  // Update the updatePhoneName function
  const updatePhoneName = async (index: number, name: string) => {
    try {
      const docRef = doc(firestore, 'companies', companyId);
      await updateDoc(docRef, {
        [`phone${index}`]: name
      });
      setPhoneNames(prev => ({ ...prev, [index]: name }));
      toast.success(`Phone ${index} name updated successfully`);
    } catch (error) {
      console.error('Error updating phone name:', error);
      toast.error('Failed to update phone name');
    }
  };

const handleDeleteEmployee = async (employeeId: string, companyId: any) => {
  try {
    // Get the employee's email before deleting
    const user = getAuth().currentUser;
    if (!user) {
      console.error("User not authenticated");
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
    const employeeRef = doc(firestore, `companies/${companyId}/employee/${employeeId}`);
    const employeeDoc = await getDoc(employeeRef);
    const employeeEmail = employeeDoc.data()?.email;

    if (!employeeEmail) {
      throw new Error('Employee email not found');
    }

    

    // Delete from Firestore
    await deleteDoc(employeeRef);
    
    
    // Delete from Firebase Auth via your API endpoint
    
    const response = await axios.delete(`${baseUrl}/api/auth/user`, {
      data: { email: employeeEmail }
    });
    
    
    if (response.status !== 200) {
      throw new Error('Failed to delete user from authentication');
    }

    // Update UI
    const updatedEmployeeList = employeeList.filter(employee => employee.id !== employeeId);
    setEmployeeList(updatedEmployeeList);
    
    toast.success('Employee deleted successfully');
    toggleModal();
  } catch (error) {
    console.error("Error deleting employee:", error);
    if (axios.isAxiosError(error)) {
      console.error('API Error details:', {
        status: error.response?.status,
        data: error.response?.data
      });
      toast.error(`Failed to delete employee: ${error.response?.data?.message || error.message}`);
    } else {
      toast.error('Failed to delete employee: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
};

const handlePageChange = ({ selected }: { selected: number }) => {
  setCurrentPage(selected);
};

const [searchTerm, setSearchTerm] = useState("");

const filteredEmployees = useMemo(() => {
  let filtered = employeeList;
  
  if (searchTerm.trim()) {
    const lowercaseSearchTerm = searchTerm.toLowerCase();
    filtered = filtered.filter(employee => 
      employee.name.toLowerCase().includes(lowercaseSearchTerm) ||
      employee.email?.toLowerCase().includes(lowercaseSearchTerm) ||
      employee.employeeId?.toLowerCase().includes(lowercaseSearchTerm) ||
      employee.phoneNumber?.toLowerCase().includes(lowercaseSearchTerm)
    );
  }

  if (selectedGroup) {
    filtered = filtered.filter(employee => employee.group === selectedGroup);
  }

  return filtered;
}, [employeeList, searchTerm, selectedGroup]);

const paginatedEmployees = filteredEmployees
  .sort((a, b) => {
    const roleOrder = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4 };
    return roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
  })
  .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex justify-between items-center ml-4 mt-10">
        <h2 className="text-2xl font-bold intro-y text-gray-800 dark:text-gray-200">Users Directory</h2>
        <ThemeSwitcher />
      </div>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-900">
        <div className="text-lg font-medium text-gray-800 dark:text-gray-200 intro-y">
          Total Users: {employeeList.length}
        </div>
        {currentUserEmail && (
          <div className="ml-4 text-lg text-gray-600 dark:text-gray-400">
            {currentUserEmail.split('@')[0]}
          </div>
        )}
      </div>
      <div className="flex-grow p-5">
        <div className="sticky top-0 bg-gray-100 dark:bg-gray-900 z-10 py-2">
          <div className="flex flex-wrap items-center mt-2 intro-y sm:flex-nowrap">
          <Link to="settings">
  <Button variant="primary" className="mr-2 shadow-md">
    <Lucide icon="Settings" className="w-4 h-4 mr-2" />
    Settings
  </Button>
</Link>
           
           
         
            {/* Add a dropdown to show phone names */}
            {phoneCount >= 2 && (
              <Menu className="mr-2">
                <Menu.Button as={Button} variant="outline-secondary" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  Phone Numbers <Lucide icon="ChevronDown" className="w-4 h-4 ml-2" />
                </Menu.Button>
                <Menu.Items className="w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg mt-2">
                  {Object.entries(phoneNames).map(([index, phoneName]) => (
                    <Menu.Item key={index} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {companyData?.[`phone${index}`] || `Phone ${index}`}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{phoneName || `Phone ${index}`}</span>
                        </div>
                        <button
                          onClick={() => {
                            const newName = prompt(`Enter new name for ${phoneName || `Phone ${index}`}`, phoneName);
                            if (newName) updatePhoneName(parseInt(index), newName);
                          }}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Lucide icon="Pencil" className="w-4 h-4" />
                        </button>
                      </div>
                    </Menu.Item>
                  ))}
                </Menu.Items>
              </Menu>
            )}
            <Menu className="mr-2">
              <Menu.Button as={Button} variant="outline-secondary" className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                {selectedGroup || "Select a group"} <Lucide icon="ChevronDown" className="w-4 h-4" />
              </Menu.Button>
              <Menu.Items className="w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg mt-2">
                <Menu.Item as="button" onClick={() => setSelectedGroup('')} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  Select All
                </Menu.Item>
                {groups.map(group => (
                  <Menu.Item as="button" key={group} onClick={() => setSelectedGroup(group)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    {group}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Menu>
            <div className="w-full mt-3 sm:w-auto sm:mt-0 sm:ml-auto md:ml-0">
              <div className="relative w-56 text-slate-500">
                <FormInput
                  type="text"
                  className="w-56 pr-10 !box"
                  placeholder="Search name, ID, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Lucide
                  icon="Search"
                  className="absolute inset-y-0 right-0 w-4 h-4 my-auto mr-3"
                />
              </div>
            </div>
            <div className="flex-grow"></div>
            <div className="flex justify-end items-center font-medium">
            <ReactPaginate
              breakLabel="..."
              nextLabel={<>Next <span className="hidden sm:inline">&gt;</span></>}
              previousLabel={<><span className="hidden sm:inline">&lt;</span> Previous</>}
              onPageChange={handlePageChange}
              pageRangeDisplayed={3}
              marginPagesDisplayed={1}
              pageCount={Math.ceil(filteredEmployees.length / itemsPerPage)}
              renderOnZeroPageCount={null}
              containerClassName="flex justify-center items-center flex-wrap mt-2"
              pageClassName="m-1"
              pageLinkClassName="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
              previousClassName="m-1"
              nextClassName="m-1"
              previousLinkClassName="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
              nextLinkClassName="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
              disabledClassName="opacity-50 cursor-not-allowed"
              activeClassName="font-bold"
              activeLinkClassName="bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
              breakClassName="mx-1"
              breakLinkClassName="px-2 py-1 text-gray-700 dark:text-gray-300"
            />
            </div>
          </div>
        </div>
        <div className="mt-5">
          {paginatedEmployees.map((employee, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 mb-2 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  {/* Avatar/Initial Section */}
                  <div className="flex-shrink-0">
                    {employee.imageUrl ? (
                      <img
                        src={employee.imageUrl}
                        alt={employee.name}
                        className="w-14 h-14 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
                        <span className="text-lg font-medium text-purple-700 dark:text-purple-200">
                          {employee.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* User Info Section */}
                  <div className="ml-4 flex-1">
                    <div className="flex items-center">
                      <div className="font-medium">
                        <span className="text-blue-500 dark:text-blue-300">{employee.employeeId}</span> <span className="text-gray-900 dark:text-gray-100 capitalize">{employee.name}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {employee.email}
                    </div>
                  </div>

                  {/* Role/Status Section */}
                  <div className="flex items-center">
                    <div className="mr-8">
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {employee.role === "1" ? 'Administrator' : 
                        employee.role === "2" ? 'Sales Agent' : 
                        employee.role === "3" ? 'Observer' : 
                        employee.role === "4" ? 'Manager' : 
                        employee.role === "5" ? 'Supervisor' : 'Other'}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    {(role === "1" || (role !== "1" && employee.email === currentUserEmail)) && (
                      <button
                        onClick={() => navigate(`crud-form`, { 
                          state: { 
                            contactId: employee.id, 
                            contact: employee, 
                            companyId: companyId || '' 
                          } 
                        })}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <Lucide icon="Pencil" className="w-5 h-5" />
                      </button>
                    )}
                    {role === "1" && (
                      <button 
                        onClick={() => toggleModal(employee.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Lucide icon="Trash" className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
      {isModalOpen && (
        <div 
          id="popup-modal" 
          tabIndex={-1} 
          className="overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full flex"
        >
          <div className="relative p-4 w-full max-w-md max-h-full">
            <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
              <button 
                onClick={() => toggleModal()}
                type="button" 
                className="absolute top-3 end-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
              >
                <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                </svg>
                <span className="sr-only">Close modal</span>
              </button>
              <div className="p-4 md:p-5 text-center">
                <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">Are you sure you want to delete User?</h3>
                <button onClick={() => handleDeleteEmployee(employeeIdToDelete, companyId)} type="button" className="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center">
                  Yes, I'm sure
                </button>
                <button onClick={() => toggleModal()} type="button" className="py-2.5 px-5 ms-3 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">
                  No, cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}

export default Main;