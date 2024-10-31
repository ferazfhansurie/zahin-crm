import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Button from "@/components/Base/Button";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface FollowUp {
    id: string;
    message: string;
    interval: number;
    intervalUnit: 'minutes' | 'hours' | 'days';
    previousMessageId: string | null;
    sequence: number;
    status: 'active' | 'inactive';
    createdAt: Date;
    lastSent?: Date;
    document?: string | null;
    image?: string | null;
}

interface TimeInterval {
    value: number;
    unit: 'minutes' | 'hours' | 'days';
    label: string;
}

interface User {
    companyId: string;
}

const TIME_INTERVALS: TimeInterval[] = [
    { value: 5, unit: 'minutes', label: '5 minutes' },
    { value: 10, unit: 'minutes', label: '10 minutes' },
    { value: 30, unit: 'minutes', label: '30 minutes' },
    { value: 1, unit: 'hours', label: '1 hour' },
    { value: 2, unit: 'hours', label: '2 hours' },
    { value: 4, unit: 'hours', label: '4 hours' },
    { value: 8, unit: 'hours', label: '8 hours' },
    { value: 12, unit: 'hours', label: '12 hours' },
    { value: 24, unit: 'hours', label: '1 day' },
    { value: 48, unit: 'hours', label: '2 days' },
    { value: 72, unit: 'hours', label: '3 days' },
    { value: 168, unit: 'hours', label: '1 week' },
];

const FollowUpsPage: React.FC = () => {
    const [followUps, setFollowUps] = useState<FollowUp[]>([]);
    const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [customInterval, setCustomInterval] = useState({
        value: '',
        unit: 'minutes' as 'minutes' | 'hours' | 'days'  // Update this type
    });
    
    const [newFollowUp, setNewFollowUp] = useState({
        message: '',
        interval: 5,
        intervalUnit: 'minutes' as 'minutes' | 'hours' | 'days',
        previousMessageId: null as string | null,
        status: 'active' as const,
        sequence: 1
    });

    // Firebase setup
    const firestore = getFirestore();
    const auth = getAuth();
    const storage = getStorage();

    useEffect(() => {
        fetchFollowUps();
    }, []);

    const fetchFollowUps = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) {
                console.error('No such document for user!');
                return;
            }
            const userData = userSnapshot.data();
            const companyId = userData.companyId;

            // Fetch follow-ups
            const followUpRef = collection(firestore, `companies/${companyId}/followUps`);
            const followUpQuery = query(followUpRef, orderBy('createdAt', 'desc'));
            const followUpSnapshot = await getDocs(followUpQuery);

            const fetchedFollowUps: FollowUp[] = followUpSnapshot.docs.map(doc => ({
                id: doc.id,
                message: doc.data().message || '',
                interval: doc.data().interval || 5,
                intervalUnit: doc.data().intervalUnit || 'minutes' as 'minutes' | 'hours' | 'days',
                previousMessageId: doc.data().previousMessageId || null,
                sequence: doc.data().sequence || 1,
                status: doc.data().status || 'active',
                createdAt: doc.data().createdAt.toDate(),
                document: doc.data().document || null,
                image: doc.data().image || null,
            }));

            setFollowUps(fetchedFollowUps);
        } catch (error) {
            console.error('Error fetching follow ups:', error);
        }
    };

    const uploadDocument = async (file: File): Promise<string> => {
        const storageRef = ref(storage, `quickReplies/${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const uploadImage = async (file: File): Promise<string> => {
        const storageRef = ref(storage, `images/${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const addFollowUp = async () => {
        if (newFollowUp.message.trim() === '') return;

        try {
            const user = auth.currentUser;
            if (!user) {
                console.error('No authenticated user');
                return;
            }

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) {
                console.error('No such document for user!');
                return;
            }
            const userData = userSnapshot.data();
            const companyId = userData.companyId;

            const newFollowUpData = {
                message: newFollowUp.message,
                interval: newFollowUp.interval,
                intervalUnit: newFollowUp.intervalUnit,
                previousMessageId: newFollowUp.previousMessageId,
                status: newFollowUp.status,
                createdAt: serverTimestamp(),
                document: selectedDocument ? await uploadDocument(selectedDocument) : null,
                image: selectedImage ? await uploadImage(selectedImage) : null,
            };

            const followUpRef = collection(firestore, `companies/${companyId}/followUps`);
            await addDoc(followUpRef, newFollowUpData);

            setNewFollowUp({
                message: '',
                interval: 5,
                intervalUnit: 'minutes' as 'minutes' | 'hours' | 'days',
                previousMessageId: null as string | null,
                status: 'active' as const,
                sequence: 1
            });
            setSelectedDocument(null);
            setSelectedImage(null);
            fetchFollowUps();
        } catch (error) {
            console.error('Error adding follow up:', error);
        }
    };

    const updateFollowUp = async (
        id: string,
        message: string,
        interval: number,
        intervalUnit: 'minutes' | 'hours' | 'days',
        previousMessageId: string | null,
        status: 'active' | 'inactive'
    ) => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const companyId = userSnapshot.data().companyId;

            const followUpRef = doc(firestore, `companies/${companyId}/followUps`, id);

            const updatedData: Partial<FollowUp> = {
                message,
                interval,
                intervalUnit,
                previousMessageId,
                status,
            };

            // Handle document upload if a new document is selected
            if (selectedDocument) {
                updatedData.document = await uploadDocument(selectedDocument);
            }

            // Handle image upload if a new image is selected
            if (selectedImage) {
                updatedData.image = await uploadImage(selectedImage);
            }

            await updateDoc(followUpRef, updatedData);
            setIsEditing(null);
            setSelectedDocument(null);
            setSelectedImage(null);
            fetchFollowUps();
        } catch (error) {
            console.error('Error updating follow up:', error);
        }
    };

    const deleteFollowUp = async (id: string) => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const companyId = userSnapshot.data().companyId;

            const followUpRef = doc(firestore, `companies/${companyId}/followUps`, id);
            await deleteDoc(followUpRef);
            fetchFollowUps();
        } catch (error) {
            console.error('Error deleting follow up:', error);
        }
    };

    const filteredFollowUps = followUps
        .filter(followUp => followUp.status === 'active')
        .filter(followUp => 
            followUp.message.toLowerCase().includes(searchQuery.toLowerCase())
        )
        // Replace message sorting with createdAt sorting
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <div className="flex-grow overflow-y-auto">
                <div className="p-5 min-h-full">
                    <h2 className="text-2xl font-bold mb-5">Follow Ups</h2>
                    <div className="mb-5">
                        <input
                            className="w-full px-4 py-2 mb-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            placeholder="New follow up message"
                            value={newFollowUp.message}
                            onChange={(e) => setNewFollowUp({ ...newFollowUp, message: e.target.value })}
                        />
                        
                        <div className="flex items-center gap-2 mb-2">
                            <select
                                className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
                                value={`${newFollowUp.interval}-${newFollowUp.intervalUnit}`}
                                onChange={(e) => {
                                    if (e.target.value === '-1') {
                                        // Custom interval selected
                                        setNewFollowUp({
                                            ...newFollowUp,
                                            interval: 0
                                        });
                                    } else {
                                        const [value, unit] = e.target.value.split('-');
                                        setNewFollowUp({
                                            ...newFollowUp,
                                            interval: parseInt(value),
                                            intervalUnit: unit as 'minutes' | 'hours' | 'days'
                                        });
                                    }
                                }}
                            >
                                {TIME_INTERVALS.map((interval) => (
                                    <option key={`${interval.value}-${interval.unit}`} value={`${interval.value}-${interval.unit}`}>
                                        {interval.label}
                                    </option>
                                ))}
                                <option value="-1">Custom Interval</option>
                            </select>

                            {newFollowUp.interval === 0 && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        className="w-24 px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
                                        placeholder="Value"
                                        value={customInterval.value}
                                        onChange={(e) => {
                                            setCustomInterval({
                                                ...customInterval,
                                                value: e.target.value
                                            });
                                            setNewFollowUp({
                                                ...newFollowUp,
                                                interval: parseInt(e.target.value) || 0
                                            });
                                        }}
                                    />
                                    <select
                                        className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
                                        value={customInterval.unit}
                                        onChange={(e) => {
                                            const unit = e.target.value as 'minutes' | 'hours' | 'days';
                                            setCustomInterval({
                                                ...customInterval,
                                                unit
                                            });
                                            setNewFollowUp({
                                                ...newFollowUp,
                                                intervalUnit: unit
                                            });
                                        }}
                                    >
                                        <option value="minutes">Minutes</option>
                                        <option value="hours">Hours</option>
                                        <option value="days">Days</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center mb-2">
                            <input
                                type="file"
                                id="followUpFile"
                                className="hidden"
                                onChange={(e) => setSelectedDocument(e.target.files ? e.target.files[0] : null)}
                            />
                            <label htmlFor="followUpFile" className="mr-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer">
                                Attach Document
                            </label>
                            <input
                                type="file"
                                id="followUpImage"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => setSelectedImage(e.target.files ? e.target.files[0] : null)}
                            />
                            <label htmlFor="followUpImage" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer">
                                Attach Image
                            </label>
                        </div>
                        <button
                            className="px-4 py-2 bg-primary text-white rounded-lg"
                            onClick={addFollowUp}
                        >
                            Add Follow Up
                        </button>
                    </div>
                    <div className="space-y-4">
                        {filteredFollowUps.map((followUp, index) => (
                            <div key={followUp.id} className="p-4 border rounded-lg">
                                <div className="flex items-center mb-2">
                                    <span className="inline-block px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full mr-2">
                                        Step {index + 1}
                                    </span>
                                    <span className="text-gray-500">
                                        {followUp.interval} {followUp.intervalUnit} {index === 0 ? 'after first message received' : 'after previous step'}
                                    </span>
                                </div>
                                {isEditing === followUp.id ? (
                                    <>
                                        <input
                                            className="w-full px-4 py-2 mb-2 border rounded-lg  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                            value={followUp.message}
                                            onChange={(e) => {
                                                const updatedFollowUp = {...followUp, message: e.target.value};
                                                setFollowUps(followUps.map(f => f.id === followUp.id ? updatedFollowUp : f));
                                            }}
                                        />
                                        <div className="flex items-center gap-2 mb-2">
                                            <select
                                                className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
                                                value={`${followUp.interval}-${followUp.intervalUnit}`}
                                                onChange={(e) => {
                                                    if (e.target.value === '-1') {
                                                        const updatedFollowUp = {...followUp, interval: 0};
                                                        setFollowUps(followUps.map(f => f.id === followUp.id ? updatedFollowUp : f));
                                                    } else {
                                                        const [value, unit] = e.target.value.split('-');
                                                        const updatedFollowUp = {
                                                            ...followUp,
                                                            interval: parseInt(value),
                                                            intervalUnit: unit as 'minutes' | 'hours' | 'days'
                                                        };
                                                        setFollowUps(followUps.map(f => f.id === followUp.id ? updatedFollowUp : f));
                                                    }
                                                }}
                                            >
                                                {TIME_INTERVALS.map((interval) => (
                                                    <option key={`${interval.value}-${interval.unit}`} value={`${interval.value}-${interval.unit}`}>
                                                        {interval.label}
                                                    </option>
                                                ))}
                                                <option value="-1">Custom Interval</option>
                                            </select>

                                            {followUp.interval === 0 && (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        className="w-24 px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
                                                        placeholder="Value"
                                                        value={followUp.interval || ''}
                                                        onChange={(e) => {
                                                            const updatedFollowUp = {
                                                                ...followUp,
                                                                interval: parseInt(e.target.value) || 0
                                                            };
                                                            setFollowUps(followUps.map(f => f.id === followUp.id ? updatedFollowUp : f));
                                                        }}
                                                    />
                                                    <select
                                                        className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
                                                        value={followUp.intervalUnit}
                                                        onChange={(e) => {
                                                            const updatedFollowUp = {
                                                                ...followUp,
                                                                intervalUnit: e.target.value as 'minutes' | 'hours' | 'days'
                                                            };
                                                            setFollowUps(followUps.map(f => f.id === followUp.id ? updatedFollowUp : f));
                                                        }}
                                                    >
                                                        <option value="minutes">Minutes</option>
                                                        <option value="hours">Hours</option>
                                                        <option value="days">Days</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center mb-2">
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    id={`editFollowUpFile-${followUp.id}`}
                                                    className="hidden"
                                                    onChange={(e) => setSelectedDocument(e.target.files ? e.target.files[0] : null)}
                                                />
                                                <label htmlFor={`editFollowUpFile-${followUp.id}`} className="mr-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer">
                                                    {followUp.document ? 'Replace Document' : 'Attach Document'}
                                                </label>
                                                <input
                                                    type="file"
                                                    id={`editFollowUpImage-${followUp.id}`}
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => setSelectedImage(e.target.files ? e.target.files[0] : null)}
                                                />
                                                <label htmlFor={`editFollowUpImage-${followUp.id}`} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer">
                                                    {followUp.image ? 'Replace Image' : 'Attach Image'}
                                                </label>
                                            </div>
                                            <div className="flex-shrink-0 ml-4">
                                                <button
                                                    className="ml-2 px-4 py-2 bg-green-500 text-white rounded-lg"
                                                    onClick={() => updateFollowUp(followUp.id, followUp.message, followUp.interval, followUp.intervalUnit, followUp.previousMessageId, followUp.status)}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    className="ml-2 px-4 py-2 bg-gray-500 text-white rounded-lg"
                                                    onClick={() => setIsEditing(null)}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-grow">
                                                <h3 className="text-xl font-bold">{followUp.message}</h3>
                                                <p className="text-base text-gray-600 dark:text-gray-300 mt-1">{followUp.message}</p>
                                            </div>
                                            <div className="flex-shrink-0 ml-4">
                                                <button
                                                    className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg mr-2 text-sm"
                                                    onClick={() => setIsEditing(followUp.id)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="ml-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm"
                                                    onClick={() => deleteFollowUp(followUp.id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        {followUp.image && (
                                            <div className="mt-2">
                                                <img
                                                    src={followUp.image}
                                                    alt="Follow Up Image"
                                                    className="rounded-lg cursor-pointer w-full h-full object-contain"
                                                    onClick={() => window.open(followUp.image ?? '', '_blank')}
                                                />
                                            </div>
                                        )}
                                        {followUp.document && (
                                            <div className="mt-2">
                                                <iframe
                                                    src={followUp.document}
                                                    title="Document"
                                                    className="border rounded cursor-pointer w-full"
                                                    style={{ height: '100vh' }}
                                                    onClick={() => window.open(followUp.document ?? '', '_blank')}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FollowUpsPage;
