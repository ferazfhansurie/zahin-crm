import { ClassicEditor } from "@/components/Base/Ckeditor";

import React, { useState, useEffect } from "react";
import Button from "@/components/Base/Button";
import { getAuth, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLocation, useNavigate } from 'react-router-dom';
import { FormInput, FormLabel } from "@/components/Base/Form";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { onAuthStateChanged } from "firebase/auth";

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

function Main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [categories, setCategories] = useState(["1"]);
  const [groups, setGroups] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { contactId, contact } = location.state ?? {};

  const [companyId, setCompanyId] = useState("");
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [newGroup, setNewGroup] = useState("");

  const [currentUserRole, setCurrentUserRole] = useState("");

  const [phoneOptions, setPhoneOptions] = useState<number[]>([]);
  const [phoneNames, setPhoneNames] = useState<{ [key: number]: string }>({});

  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(firestore, 'user', user.email!);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setCompanyId(userData.companyId);
            setCurrentUserRole(userData.role);
            console.log("Fetched companyId:", userData.companyId);
            
            // Fetch phoneIndex from company document
            fetchPhoneIndex(userData.companyId);
          } else {
            console.log("No user document found");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        console.log("No user signed in");
      }
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  useEffect(() => {
    if (companyId) {
      fetchGroups();
    }
  }, [companyId]);

  const [userData, setUserData] = useState<{
    name: string;
    phoneNumber: string;
    email: string;
    password: string;
    role: string;
    companyId: string;
    group: string;
    employeeId: string;
    notes: string;
    quotaLeads: number;
    invoiceNumber: string | null;
    phone: number;
    imageUrl: string;
  }>({
    name: "",
    phoneNumber: "",
    email: "",
    password: "",
    role: "",
    companyId: "",
    group: "",
    employeeId: "",
    notes: "",
    quotaLeads: 0,
    invoiceNumber: null,
    phone: -1,
    imageUrl: "",
  });

  useEffect(() => {
    if (contact) {
      setUserData({
        name: contact.name || "",
        phoneNumber: contact.phoneNumber ? contact.phoneNumber.split('+6')[1] ?? "" : "",
        email: contact.id || "",
        password: "",
        role: contact.role || "",
        companyId: companyId || "",
        group: contact.group || "",
        employeeId: contact.employeeId || "",
        notes: contact.notes || "",
        quotaLeads: contact.quotaLeads || 0,
        invoiceNumber: contact.invoiceNumber || null,
        phone: contact.phone || -1,
        imageUrl: contact.imageUrl || "",
      });
      setCategories([contact.role]);
    }
    fetchGroups();
  }, [contact, companyId]);

  const fetchGroups = async () => {
    if (!companyId) {
      console.log("No companyId available");
      return;
    }
    console.log("Fetching groups for company:", companyId);
    try {
      const employeeCollectionRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeCollectionRef);
      const uniqueGroups = new Set<string>();
      employeeSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.group) {
          uniqueGroups.add(data.group);
        }
      });
      const groupsArray = Array.from(uniqueGroups);
      console.log("Fetched groups:", groupsArray);
      setGroups(groupsArray);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchPhoneIndex = async (companyId: string) => {
    try {
      const companyDocRef = doc(firestore, 'companies', companyId);
      const companyDocSnap = await getDoc(companyDocRef);
      if (companyDocSnap.exists()) {
        const companyData = companyDocSnap.data();
        const phoneCount = companyData.phoneCount || 0;
        console.log('phoneCount for this company:', phoneCount);
        
        // Generate phoneNames object
        const phoneNamesData: { [key: number]: string } = {};
        for (let i = 0; i <= phoneCount; i++) {
          const phoneName = companyData[`phone${i}`];
          if (phoneName) {
            phoneNamesData[i] = phoneName;
          }
        }
        console.log('Phone names:', phoneNamesData);
        setPhoneNames(phoneNamesData);
        setPhoneOptions(Object.keys(phoneNamesData).map(Number));
      }
    } catch (error) {
      console.error("Error fetching phone count:", error);
      setPhoneOptions([]);
      setPhoneNames({});
    }
  };

  const handleChange = (e: { target: { name: any; value: any; }; }) => {
    const { name, value } = e.target;
    setUserData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Reset phone to -1 if role is not "2" (Sales)
      if (name === 'role' && value !== "2") {
        newData.phone = -1;
      }
      
      return newData;
    });
  };

  const handleAddNewGroup = () => {
    setIsAddingNewGroup(true);
  };

  const handleCancelNewGroup = () => {
    setIsAddingNewGroup(false);
    setNewGroup("");
  };

  const handleSaveNewGroup = () => {
    if (newGroup.trim()) {
      setGroups(prev => [...prev, newGroup.trim()]);
      setUserData(prev => ({ ...prev, group: newGroup.trim() }));
      setIsAddingNewGroup(false);
      setNewGroup("");
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleEditorChange = (data: string) => {
    setUserData(prev => ({ ...prev, notes: data }));
  };

  const isFieldDisabled = (fieldName: string) => {
    if (currentUserRole === "1") return false; // Admin (role 1) can edit everything
    if (currentUserRole === "3") return fieldName !== "password"; // Observer can only edit password
    if (fieldName === "role") return false; // Allow role changes for non-admin users
    return userData.role === "3"; // For other roles, they can't edit users with role 3
  };

  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    const requiredFields = ['name', 'phoneNumber', 'email', 'role'];
    
    // Only require password for new users
    if (!contactId) {
      requiredFields.push('password');
    }
    
    requiredFields.forEach(field => {
      if (!userData[field as keyof typeof userData]) {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });

    // Password validation
    if (userData.password && userData.password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }
  
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    const storage = getStorage(app);
    const storageRef = ref(storage, `employee-images/${userData.email}`);
    await uploadBytes(storageRef, imageFile);
    return getDownloadURL(storageRef);
  };

  const saveUser = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsLoading(true);
      const userOri = auth.currentUser;
      if (!userOri || !userOri.email) {
        throw new Error("No authenticated user found");
      }

      // Check if the user is updating their own profile
      const isUpdatingSelf = userOri.email === userData.email;

      if (isUpdatingSelf && userData.password) {
        // User is updating their own password
        await updatePassword(userOri, userData.password);
        toast.success("Password updated successfully");
      }

      let imageUrl = userData.imageUrl;
      if (imageFile) {
        imageUrl = await uploadImage() || "";
      }

      // Continue with the rest of the user update logic
      if (currentUserRole !== "3" || isUpdatingSelf) {
        const docUserRef = doc(firestore, 'user', userOri.email);
        const docUserSnapshot = await getDoc(docUserRef);
        const dataUser = docUserSnapshot.data();
        const companyId = dataUser!.companyId;
        const company = dataUser!.company;

        const formatPhoneNumber = (phoneNumber: string) => {
          return phoneNumber && !phoneNumber.startsWith('+') ? "+6" + phoneNumber : phoneNumber;
        };

        const userDataToSend = {
          name: userData.name,
          phoneNumber: formatPhoneNumber(userData.phoneNumber),
          email: userData.email,
          role: userData.role,
          companyId: companyId,
          company: company,
          group: userData.group,
          employeeId: userData.employeeId || null,
          notes: userData.notes || null,
          quotaLeads: userData.quotaLeads || 0,
          invoiceNumber: userData.invoiceNumber || null,
          phone: userData.phone || -1,
          imageUrl: imageUrl || "",
        };

        if (contactId) {
          // Updating existing user
          await updateDoc(doc(firestore, `companies/${companyId}/employee`, contactId), userDataToSend);
          await updateDoc(doc(firestore, 'user', userData.email), userDataToSend);
          toast.success("User updated successfully");
        } else {
          // Adding new user
          const response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/create-user/${userData.email}/${formatPhoneNumber(userData.phoneNumber)}/${userData.password}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
          });
          const responseData = await response.json();
          
          if (responseData.message === 'User created successfully') {
            await setDoc(doc(firestore, 'user', userData.email), userDataToSend);
            await setDoc(doc(firestore, `companies/${companyId}/employee`, userData.email), userDataToSend);
            toast.success("User created successfully");
            setUserData({
              name: "",
              phoneNumber: "",
              email: "",
              password: "",
              role: "",
              companyId: "",
              group: "",
              employeeId: "",
              notes: "",
              quotaLeads: 0,
              invoiceNumber: null,
              phone: -1,
              imageUrl: "",
            });
        
            const roleMap = {
              "1": "Admin",
              "2": "Sales",
              "3": "Observer",
              "4": "Manager",
              "5": "Supervisor"
            };
      
            const message = `Hi ${userData.name},\n\nYou're successfully registered as a Staff - ${roleMap[userData.role as keyof typeof roleMap]} in our system.\nHere's your registered information:\n\nPhone Number: ${userData.phoneNumber}\nEmail: ${userData.email}\nRole: ${roleMap[userData.role as keyof typeof roleMap]}\n${userData.employeeId ? `Employee ID: ${userData.employeeId}\n` : ''}\nPassword: ${userData.password || '[Not changed]'}`;
      
            let url;
            let requestBody;
            let formattedPhone = userData.phoneNumber.replace(/[^\d]/g, '');
            if (!formattedPhone.startsWith('6')) {
              formattedPhone = '6' + formattedPhone;
            }
            formattedPhone += '@c.us';
            console.log('Formatted user chat_id:', formattedPhone);
              url = `https://mighty-dane-newly.ngrok-free.app/api/v2/messages/text/${companyId}/${formattedPhone}`;
              requestBody = { 
                message,
                phoneIndex: 0, // Include phoneIndex in the request body
              };
      
            console.log('Sending request to:', url);
            console.log('Request body:', JSON.stringify(requestBody));
      
            console.log('Full request details:', {
              url,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody)
            });
      
            // Send WhatsApp message to the user
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            });
      
            if (!response.ok) {
              const errorText = await response.text();
              console.error('Error response:', response.status, errorText);
              throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
          } else {
            throw new Error(responseData.error);
          }
        }
      
  
        setSuccessMessage(contactId ? "User updated successfully" : "User created successfully");
      }

      setErrorMessage('');
      setIsLoading(false);
      navigate('/users-layout-2');
    } catch (error) {
      console.error("Error saving user:", error);
      setErrorMessage('An error occurred while saving the user');
      setIsLoading(false);
    }
  };

  const editorConfig = {
    toolbar: {
      items: [
        "bold",
        "italic",
        "link",
        "bulletedList",
        "numberedList",
        "blockQuote",
        "insertTable",
        "undo",
        "redo",
        "heading",
        "alignment",
        "fontColor",
        "fontSize",
      ],
    },
  };

  const [editorData, setEditorData] = useState("<p>Content of the editor.</p>");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="w-full px-4 py-6 h-full flex flex-col">
      <div className="flex items-center mb-2">
        <h2 className="text-2xl font-semibold">
          {contactId ? "Update User" : "Add User"}
        </h2>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex-grow overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="name">Name *</FormLabel>
            <FormInput
              id="name"
              name="name"
              type="text"
              value={userData.name}
              onChange={handleChange}
              placeholder="Name"
              disabled={isFieldDisabled("name")}
              required
            />
            {fieldErrors.name && <p className="text-red-500 text-sm mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <FormLabel htmlFor="phoneNumber">Phone Number *</FormLabel>
            <div className="flex">
              <FormInput
                type="text"
                value="+6"
                readOnly
                className="w-12 mr-2"
              />
              <FormInput
                id="phoneNumber"
                name="phoneNumber"
                type="text"
                value={userData.phoneNumber}
                onChange={handleChange}
                placeholder="Phone Number"
                className="flex-grow"
                disabled={isFieldDisabled("phoneNumber")}
                required
              />
            </div>
            {fieldErrors.phoneNumber && <p className="text-red-500 text-sm mt-1">{fieldErrors.phoneNumber}</p>}
          </div>
          <div>
            <FormLabel htmlFor="email">Email *</FormLabel>
            <FormInput
              id="email"
              name="email"
              type="text"
              value={userData.email}
              onChange={handleChange}
              placeholder="Email"
              disabled={isFieldDisabled("email")}
              required
            />
            {fieldErrors.email && <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>}
          </div>
          <div>
            <FormLabel htmlFor="group">Group</FormLabel>
            {isAddingNewGroup ? (
              <div className="flex items-center">
                <FormInput
                  type="text"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  placeholder="Enter new group name"
                  className="w-full mr-2"
                  disabled={isFieldDisabled("group")}
                />
                <Button
                  type="button"
                  variant="outline-secondary"
                  className="mr-2"
                  onClick={handleCancelNewGroup}
                  disabled={isFieldDisabled("group")}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSaveNewGroup}
                  disabled={isFieldDisabled("group")}
                >
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center">
                <select
                  id="group"
                  name="group"
                  value={userData.group}
                  onChange={handleChange}
                  className="text-black dark:text-white border-primary dark:border-primary-dark bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 rounded-lg text-sm w-full mr-2 p-2.5"
                  disabled={isFieldDisabled("group")}
                >
                  <option value="">Select a group</option>
                  {groups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={handleAddNewGroup}
                  className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 inline-flex items-center whitespace-nowrap"
                  disabled={isFieldDisabled("group")}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Add New Group
                </Button>
              </div>
            )}
          </div>
          <div>
            <FormLabel htmlFor="role">Role *</FormLabel>
            <select
              id="role"
              name="role"
              value={userData.role}
              onChange={(e) => {
                const newRole = e.target.value;
                if (currentUserRole !== "1" && newRole === "1") {
                  // Prevent non-admin users from selecting admin role
                  toast.error("You don't have permission to assign admin role.");
                  return;
                }
                handleChange(e);
                setCategories([newRole]);
              }}
              className="text-black dark:text-white border-primary dark:border-primary-dark bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 rounded-lg text-sm w-full"
              disabled={isFieldDisabled("role")}
              required
            >
              <option value="">Select role</option>
              {currentUserRole === "1" && <option value="1">Admin</option>}
              {currentUserRole === "1" && <option value="4">Manager</option>}
              {currentUserRole === "1" && <option value="5">Supervisor</option>}
              <option value="2">Sales</option>
              <option value="3">Observer</option>
            </select>
            {fieldErrors.role && <p className="text-red-500 text-sm mt-1">{fieldErrors.role}</p>}
          </div>
          <div>
            <FormLabel htmlFor="phone">Phone</FormLabel>
            <select
              id="phone"
              name="phone"
              value={userData.phone}
              onChange={handleChange}
              className="text-black dark:text-white border-primary dark:border-primary-dark bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 rounded-lg text-sm w-full"
              disabled={isFieldDisabled("phone") || (currentUserRole !== "1" && userData.role !== "2")}
            >
              <option value="">Select a phone</option>
              {Object.entries(phoneNames).map(([index, phoneName]) => (
                <option key={index} value={parseInt(index) - 1}>
                  {phoneName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FormLabel htmlFor="image">Profile Image</FormLabel>
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
            {userData.imageUrl && (
              <img
                src={userData.imageUrl}
                alt="Profile"
                className="mt-2 w-32 h-32 object-cover rounded-full"
              />
            )}
          </div>
          <div>
            <FormLabel htmlFor="password">Password {contactId ? '(Leave blank to keep current)' : '*'}</FormLabel>
            <FormInput
              id="password"
              name="password"
              type="password"
              value={userData.password}
              onChange={handleChange}
              placeholder={contactId ? "New password (optional)" : "Password"}
              disabled={isFieldDisabled("password") || (contactId && userData.email !== auth.currentUser?.email)}
              required={!contactId}
            />
            {fieldErrors.password && <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>}
          </div>
          <div>
            <FormLabel htmlFor="employeeId">Employee ID</FormLabel>
            <FormInput
              id="employeeId"
              name="employeeId"
              type="text"
              value={userData.employeeId}
              onChange={handleChange}
              placeholder="Employee ID (optional)"
              disabled={isFieldDisabled("employeeId")}
            />
          </div>
          <div>
            <FormLabel htmlFor="quotaLeads">Quota Leads</FormLabel>
            <FormInput
              id="quotaLeads"
              name="quotaLeads"
              type="number"
              value={userData.quotaLeads}
              onChange={(e) => setUserData(prev => ({ ...prev, quotaLeads: parseInt(e.target.value) || 0 }))}
              placeholder="Number of quota leads"
              min="0"
              disabled={isFieldDisabled("quotaLeads")}
            />
          </div>
          <div>
            <FormLabel htmlFor="invoiceNumber">Invoice Number</FormLabel>
            <FormInput
              id="invoiceNumber"
              name="invoiceNumber"
              type="text"
              value={userData.invoiceNumber || ""}
              onChange={(e) => setUserData(prev => ({ ...prev, invoiceNumber: e.target.value || null }))}
              placeholder="Invoice Number (optional)"
              disabled={isFieldDisabled("invoiceNumber")}
            />
          </div>
        </div>
        <div className="mt-4">
          <FormLabel htmlFor="notes">Notes</FormLabel>
          <div className="relative rounded-lg focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark focus:border-transparent">
            <ClassicEditor
              value={userData.notes}
              onChange={handleEditorChange}
              config={editorConfig}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
              disabled={isFieldDisabled("notes")}
            />
          </div>
        </div>
        {errorMessage && <div className="text-red-500 mt-4">{errorMessage}</div>}
        {successMessage && <div className="text-green-500 mt-4">{successMessage}</div>}
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="outline-secondary"
          className="w-24 mr-4"
          onClick={handleGoBack}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          className="w-24"
          onClick={saveUser}
          disabled={isLoading || (currentUserRole === "3" && !userData.password)}
        >
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </div>
      <ToastContainer />
    </div>
  );
}

export default Main;