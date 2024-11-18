import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Button from "@/components/Base/Button";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Select from 'react-select';

interface FollowUpTemplate {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    createdAt: Date;
    startTime: Date;
    isCustomStartTime: boolean;
    triggerTags?: string[];  // Add this line
}

// Add Tag interface
interface Tag {
    id: string;
    name: string;
}

interface FollowUp {
    id: string;
    message: string;
    interval: number;
    intervalUnit: 'minutes' | 'hours' | 'days';
    previousMessageId: string | null;
    sequence: number;
    status: 'active' | 'inactive';
    createdAt: Date;
    document?: string | null;
    image?: string | null;
}


interface FollowUpMessage {
    id: string;
    templateId: string;
    message: string;
    dayNumber: number;
    sequence: number;
    document?: string | null;
    image?: string | null;
    status: 'active' | 'inactive';
    createdAt: Date;
    delayAfter: {
        value: number;
        unit: 'minutes' | 'hours' | 'days';
        isInstantaneous: boolean;
    };
    specificNumbers?: {
        enabled: boolean;
        numbers: string[];
    };
}

interface TimeInterval {
    value: number;
    unit: 'minutes' | 'hours' | 'days';
    label: string;
}

interface User {
    companyId: string;
}

interface Tag {
    id: string;
    name: string;
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
    const [templates, setTemplates] = useState<FollowUpTemplate[]>([]);
    const [messages, setMessages] = useState<FollowUpMessage[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [isAddingTemplate, setIsAddingTemplate] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [followUps, setFollowUps] = useState<FollowUp[]>([]);
    const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isEditingMessage, setIsEditingMessage] = useState<string | null>(null);
    const [editingMessage, setEditingMessage] = useState<FollowUpMessage | null>(null);
    const [isCustomStartTime, setIsCustomStartTime] = useState(false);
    const [customStartTime, setCustomStartTime] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [newNumber, setNewNumber] = useState('');
    const [customInterval, setCustomInterval] = useState({
        value: '',
        unit: 'minutes' as 'minutes' | 'hours' | 'days'  // Update this type
    });
    const [tags, setTags] = useState<Tag[]>([]);
    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userData = (await getDoc(userRef)).data() as User;
            
            const tagsRef = collection(firestore, `companies/${userData.companyId}/tags`);
            const tagsSnapshot = await getDocs(tagsRef);
            
            const fetchedTags = tagsSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name
            }));

            setTags(fetchedTags);
        } catch (error) {
            console.error('Error fetching tags:', error);
        }
    };

    const [newTemplate, setNewTemplate] = useState({
        name: '',
        triggerTags: [] as string[],
        startType: 'immediate' as 'immediate' | 'delayed' | 'custom'
    });

    

    
    const [newFollowUp, setNewFollowUp] = useState({
        message: '',
        interval: 5,
        intervalUnit: 'minutes' as 'minutes' | 'hours' | 'days',
        previousMessageId: null as string | null,
        status: 'active' as const,
        sequence: 1
    });

    const [newMessage, setNewMessage] = useState<{
        message: string;
        dayNumber: number;
        sequence: number;
        templateId: string;
        status: 'active';
        delayAfter: {
            value: number;
            unit: 'minutes' | 'hours' | 'days';
            isInstantaneous: boolean;
        };
        specificNumbers: {
            enabled: boolean;
            numbers: string[];  // Explicitly type as string array
        };
    }>({
        message: '',
        dayNumber: 1,
        sequence: 1,
        templateId: '',
        status: 'active',
        delayAfter: {
            value: 5,
            unit: 'minutes',
            isInstantaneous: false
        },
        specificNumbers: {
            enabled: false,
            numbers: []  // Initialize empty string array
        }
    });

    // Firebase setup
    const firestore = getFirestore();
    const auth = getAuth();
    const storage = getStorage();

    useEffect(() => {
        fetchFollowUps();
        fetchTemplates();
    }, []);

    useEffect(() => {
        fetchTags();
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

    // Add new template
    const addTemplate = async () => {
        if (!newTemplate.name.trim()) return;
    
        try {
            const user = auth.currentUser;
            if (!user) return;
    
            const userRef = doc(firestore, 'user', user.email!);
            const userData = (await getDoc(userRef)).data() as User;
            
            let startTime: Date;
            switch (newTemplate.startType) {
                case 'immediate':
                    startTime = new Date();
                    break;
                case 'delayed':
                    startTime = new Date();
                    startTime.setHours(startTime.getHours() + 24);
                    break;
                case 'custom':
                    startTime = new Date(customStartTime);
                    break;
                default:
                    startTime = new Date();
            }
            
        const templateData = {
            name: newTemplate.name,
            status: 'active',
            createdAt: serverTimestamp(),
            startTime: startTime,
            isCustomStartTime: newTemplate.startType === 'custom',
            triggerTags: newTemplate.triggerTags
        };

        const templateRef = collection(firestore, `companies/${userData.companyId}/followUpTemplates`);
        await addDoc(templateRef, templateData);
        
        setIsAddingTemplate(false);
        setNewTemplate({
            name: '',
            triggerTags: [],
            startType: 'immediate'
        });
        setCustomStartTime('');
        fetchTemplates();
        toast.success('Template created successfully');
    } catch (error) {
        console.error('Error adding template:', error);
        toast.error('Failed to create template');
    }
};

    const updateMessage = async (messageId: string) => {
        if (!editingMessage || !selectedTemplate) return;

        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userData = (await getDoc(userRef)).data() as User;
            
            // Update: Use subcollection path
            const messageRef = doc(firestore, 
                `companies/${userData.companyId}/followUpTemplates/${selectedTemplate}/messages`, 
                messageId
            );
            
            const updateData: Partial<FollowUpMessage> = {
                message: editingMessage.message,
                delayAfter: editingMessage.delayAfter,
            };

            if (selectedDocument) {
                updateData.document = await uploadDocument(selectedDocument);
            }
            if (selectedImage) {
                updateData.image = await uploadImage(selectedImage);
            }

            await updateDoc(messageRef, updateData);
            
            setIsEditingMessage(null);
            setEditingMessage(null);
            setSelectedDocument(null);
            setSelectedImage(null);
            
            fetchMessages(selectedTemplate);
        } catch (error) {
            console.error('Error updating message:', error);
        }
    };
    
    const deleteMessage = async (messageId: string) => {
        if (!selectedTemplate) return;

        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userData = (await getDoc(userRef)).data() as User;
            
            // Update: Use subcollection path
            const messageRef = doc(firestore, 
                `companies/${userData.companyId}/followUpTemplates/${selectedTemplate}/messages`, 
                messageId
            );
            await deleteDoc(messageRef);
            
            fetchMessages(selectedTemplate);
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const deleteTemplate = async (templateId: string) => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userData = (await getDoc(userRef)).data() as User;
            
            // Delete all messages in the subcollection first
            const messagesRef = collection(firestore, 
                `companies/${userData.companyId}/followUpTemplates/${templateId}/messages`
            );
            const messagesSnapshot = await getDocs(messagesRef);
            
            const deletionPromises = messagesSnapshot.docs.map(doc => 
                deleteDoc(doc.ref)
            );
            await Promise.all(deletionPromises);

            // Then delete the template
            const templateRef = doc(firestore, 
                `companies/${userData.companyId}/followUpTemplates`, 
                templateId
            );
            await deleteDoc(templateRef);

            // Clear selected template if it was the one deleted
            if (selectedTemplate === templateId) {
                setSelectedTemplate(null);
                setMessages([]);
            }
            
            // Refresh templates list
            fetchTemplates();
            toast.success('Template deleted successfully');
        } catch (error) {
            console.error('Error deleting template:', error);
            toast.error('Failed to delete template');
        }
    };

    // Fetch templates
    const fetchTemplates = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userData = (await getDoc(userRef)).data() as User;
            
            const templatesRef = collection(firestore, `companies/${userData.companyId}/followUpTemplates`);
            const templatesSnapshot = await getDocs(query(templatesRef, orderBy('createdAt', 'desc')));
            
            const fetchedTemplates = templatesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt.toDate()
            })) as FollowUpTemplate[];

            setTemplates(fetchedTemplates);
        } catch (error) {
            console.error('Error fetching templates:', error);
        }
    };

    // Fetch messages for selected template
    const fetchMessages = async (templateId: string) => {
        try {
            const user = auth.currentUser;
        if (!user) return;

        const userRef = doc(firestore, 'user', user.email!);
        const userData = (await getDoc(userRef)).data() as User;
        
        // Update: Use subcollection path
        const messagesRef = collection(firestore, 
            `companies/${userData.companyId}/followUpTemplates/${templateId}/messages`
        );
        const messagesSnapshot = await getDocs(
            query(
                messagesRef,
                orderBy('dayNumber'),
                orderBy('sequence')
            )
        );
        
        const fetchedMessages = messagesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate()
        })) as FollowUpMessage[];

        setMessages(fetchedMessages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        }
    };

    // Add this helper function to check for duplicate messages
    const isDuplicateMessage = (dayNumber: number, sequence: number) => {
        return messages.some(message => 
            message.dayNumber === dayNumber && 
            message.sequence === sequence
        );
    };

    // Add message to template
    const addMessage = async () => {
        if (!selectedTemplate || !newMessage.message.trim()) return;

        // Check for duplicate message
        if (isDuplicateMessage(newMessage.dayNumber, newMessage.sequence)) {
            toast.error(`Message ${newMessage.sequence} for Day ${newMessage.dayNumber} already exists`);
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userData = (await getDoc(userRef)).data() as User;
            
            // Ensure specificNumbers is properly structured
            const messageData = {
                ...newMessage,
                status: 'active',
                createdAt: serverTimestamp(),
                document: selectedDocument ? await uploadDocument(selectedDocument) : null,
                image: selectedImage ? await uploadImage(selectedImage) : null,
                specificNumbers: {
                    enabled: newMessage.specificNumbers.enabled,
                    numbers: newMessage.specificNumbers.enabled ? 
                        newMessage.specificNumbers.numbers : []
                }
            };

            const messagesRef = collection(firestore, 
                `companies/${userData.companyId}/followUpTemplates/${selectedTemplate}/messages`
            );
            await addDoc(messagesRef, messageData);
            
            // Reset form
            setNewMessage({
                message: '',
                dayNumber: 1,
                sequence: getNextSequenceNumber(newMessage.dayNumber),
                templateId: selectedTemplate,
                status: 'active' as const,
                delayAfter: {
                    value: 5,
                    unit: 'minutes',
                    isInstantaneous: false
                },
                specificNumbers: {
                    enabled: false,
                    numbers: []
                }
            });
            setNewNumber('');
            setSelectedDocument(null);
            setSelectedImage(null);
            fetchMessages(selectedTemplate);
            toast.success('Message added successfully');
        } catch (error) {
            console.error('Error adding message:', error);
            toast.error('Failed to add message');
        }
    };

    // Add this helper function to get the next available sequence number for a given day
    const getNextSequenceNumber = (dayNumber: number) => {
        const dayMessages = messages.filter(message => message.dayNumber === dayNumber);
        if (dayMessages.length === 0) return 1;
        
        const maxSequence = Math.max(...dayMessages.map(message => message.sequence));
        return maxSequence + 1;
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <div className="flex-grow overflow-y-auto">
                <div className="p-5 min-h-full">
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-2xl font-bold">Follow Up Templates</h2>
                        <Button onClick={() => setIsAddingTemplate(true)}>
                            Add Template
                        </Button>
                    </div>

                    {/* Template List */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {templates.map(template => (
                            <div 
                                key={template.id}
                                className={`p-4 border rounded-lg ${
                                    selectedTemplate === template.id ? 'border-primary' : ''
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div 
                                        className="cursor-pointer flex-grow"
                                        onClick={() => {
                                            setSelectedTemplate(template.id);
                                            fetchMessages(template.id);
                                        }}
                                    >
                                        <h3 className="text-lg font-semibold">{template.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            Created: {template.createdAt.toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                            e.stopPropagation();
                                            if (window.confirm('Are you sure you want to delete this template? This will also delete all associated messages.')) {
                                                deleteTemplate(template.id);
                                            }
                                        }}
                                        className="text-white bg-red-500 hover:bg-red-600"
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add Template Modal */}
                    {isAddingTemplate && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96">
                                <h3 className="text-lg font-semibold mb-4">New Template</h3>
                                
                                {/* Template Name */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Template Name
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border rounded-lg"
                                        placeholder="Template Name"
                                        value={newTemplate.name}
                                        onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>

                                {/* Trigger Tags */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Trigger Tags
                                    </label>
                                    <Select
                                        isMulti
                                        options={tags.map(tag => ({ value: tag.name, label: tag.name }))}
                                        value={newTemplate.triggerTags.map(tag => ({ value: tag, label: tag }))}
                                        onChange={(selected) => {
                                            const selectedTags = selected ? selected.map(option => option.value) : [];
                                            setNewTemplate(prev => ({ ...prev, triggerTags: selectedTags }));
                                        }}
                                        placeholder="Select tags to trigger follow-ups..."
                                        className="basic-multi-select"
                                        classNamePrefix="select"
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        Follow-up sequence will start when any of these tags are applied
                                    </p>
                                </div>

                                {/* Start Time Options */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Start Time
                                    </label>
                                    <div className="space-y-2">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                className="mr-2"
                                                checked={newTemplate.startType === 'immediate'}
                                                onChange={() => setNewTemplate(prev => ({ 
                                                    ...prev, 
                                                    startType: 'immediate',
                                                    isCustomStartTime: false 
                                                }))}
                                            />
                                            Start immediately when tag is applied
                                        </label>
                                                            
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                className="mr-2"
                                                checked={newTemplate.startType === 'delayed'}
                                                onChange={() => setNewTemplate(prev => ({ 
                                                    ...prev, 
                                                    startType: 'delayed',
                                                    isCustomStartTime: false 
                                                }))}
                                            />
                                            Start 24 hours after tag is applied
                                        </label>

                                        {newTemplate.triggerTags.length > 0 && (
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    className="mr-2"
                                                    checked={newTemplate.startType === 'custom'}
                                                    onChange={() => setNewTemplate(prev => ({ 
                                                        ...prev, 
                                                        startType: 'custom',
                                                        isCustomStartTime: true 
                                                    }))}
                                                />
                                                Custom start time after tag is applied
                                            </label>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Custom Start Time Input */}
                                {newTemplate.startType === 'custom' && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Custom Start Time
                                        </label>
                                        <input
                                            type="datetime-local"
                                            className="w-full px-4 py-2 border rounded-lg"
                                            value={customStartTime}
                                            onChange={(e) => setCustomStartTime(e.target.value)}
                                        />
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-2">
                                    <Button 
                                        onClick={() => {
                                            setIsAddingTemplate(false);
                                            setNewTemplate({
                                                name: '',
                                                triggerTags: [],
                                                startType: 'immediate'
                                            });
                                        }}
                                        className="text-white bg-gray-500 hover:bg-gray-600"
                                    >
                                        Cancel
                                    </Button>
                                    <Button 
                                        onClick={() => {
                                            addTemplate();
                                            setNewTemplate({
                                                name: '',
                                                triggerTags: [],
                                                startType: 'immediate'
                                            });
                                        }}
                                        disabled={!newTemplate.name.trim()}
                                        className="text-white bg-primary hover:bg-primary-dark"
                                    >
                                        Create
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Messages Section */}
                    {selectedTemplate && (
                        <div className="mt-8">
                            <h3 className="text-xl font-semibold mb-4">Messages</h3>
                            
                            {/* Add Message Form */}
                            <div className="mb-6 p-4 border rounded-lg">
                                <div className="flex gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Day:
                                        </label>
                                        <input
                                            type="number"
                                            className="w-24 px-4 py-2 border rounded-lg"
                                            placeholder="Day #"
                                            value={newMessage.dayNumber}
                                            onChange={(e) => setNewMessage({
                                                ...newMessage,
                                                dayNumber: parseInt(e.target.value) || 1
                                            })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Message:
                                        </label>
                                        <input
                                            type="number"
                                            className="w-24 px-4 py-2 border rounded-lg"
                                            placeholder="Sequence #"
                                            value={newMessage.sequence}
                                            onChange={(e) => setNewMessage({
                                                ...newMessage,
                                                sequence: parseInt(e.target.value) || 1
                                            })}
                                        />
                                    </div>
                                </div>

                                {/* Message Input */}
                                <textarea
                                    className="w-full px-4 py-2 mb-4 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    placeholder="Enter message"
                                    value={newMessage.message}
                                    onChange={(e) => setNewMessage({
                                        ...newMessage,
                                        message: e.target.value
                                    })}
                                    rows={3}
                                />

                                {/* Specific Numbers Option */}
                                <div className="space-y-2 mb-4">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="mr-2"
                                            checked={newMessage.specificNumbers.enabled}
                                            onChange={(e) => setNewMessage({
                                                ...newMessage,
                                                specificNumbers: {
                                                    ...newMessage.specificNumbers,
                                                    enabled: e.target.checked
                                                }
                                            })}
                                        />
                                        Send to specific numbers
                                    </label>
                                        
                                    {newMessage.specificNumbers.enabled && (
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    className="flex-1 px-4 py-2 border rounded-lg"
                                                    placeholder="Enter phone number"
                                                    value={newNumber}
                                                    onChange={(e) => setNewNumber(e.target.value)}
                                                />
                                                <Button
                                                    onClick={() => {
                                                        if (newNumber.trim()) {
                                                            setNewMessage({
                                                                ...newMessage,
                                                                specificNumbers: {
                                                                    ...newMessage.specificNumbers,
                                                                    numbers: [...newMessage.specificNumbers.numbers, newNumber.trim()]
                                                                }
                                                            });
                                                            setNewNumber('');
                                                        }
                                                    }}
                                                >
                                                    Add
                                                </Button>
                                            </div>
                                            
                                            {/* Display added numbers */}
                                            <div className="space-y-1">
                                                {newMessage.specificNumbers.numbers.map((number, index) => (
                                                    <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
                                                        <span>{number}</span>
                                                        <button
                                                            onClick={() => {
                                                                const updatedNumbers = [...newMessage.specificNumbers.numbers];
                                                                updatedNumbers.splice(index, 1);
                                                                setNewMessage({
                                                                    ...newMessage,
                                                                    specificNumbers: {
                                                                        ...newMessage.specificNumbers,
                                                                        numbers: updatedNumbers
                                                                    }
                                                                });
                                                            }}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                

                                 {/* Delay Settings */}
                                <div className="space-y-2 mb-4">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="mr-2"
                                            checked={newMessage.delayAfter.isInstantaneous}
                                            onChange={(e) => setNewMessage({
                                                ...newMessage,
                                                delayAfter: {
                                                    ...newMessage.delayAfter,
                                                    isInstantaneous: e.target.checked
                                                }
                                            })}
                                        />
                                        Send immediately after previous message
                                    </label>
                                            
                                    {!newMessage.delayAfter.isInstantaneous && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                className="w-24 px-4 py-2 border rounded-lg"
                                                value={newMessage.delayAfter.value}
                                                onChange={(e) => setNewMessage({
                                                    ...newMessage,
                                                    delayAfter: {
                                                        ...newMessage.delayAfter,
                                                        value: parseInt(e.target.value) || 0
                                                    }
                                                })}
                                                min="0"
                                            />
                                            <select
                                                className="px-4 py-2 border rounded-lg w-32"
                                                value={newMessage.delayAfter.unit}
                                                onChange={(e) => setNewMessage({
                                                    ...newMessage,
                                                    delayAfter: {
                                                        ...newMessage.delayAfter,
                                                        unit: e.target.value as 'minutes' | 'hours' | 'days'
                                                    }
                                                })}
                                            >
                                                <option value="minutes">Minutes</option>
                                                <option value="hours">Hours</option>
                                                <option value="days">Days</option>
                                            </select>
                                            <span>after previous message</span>
                                        </div>
                                    )}
                                </div>

                                {/* Document and Image Upload */}
                                <div className="flex items-center mb-4">
                                    <input
                                        type="file"
                                        id="messageDocument"
                                        className="hidden"
                                        onChange={(e) => setSelectedDocument(e.target.files ? e.target.files[0] : null)}
                                    />
                                    <label 
                                        htmlFor="messageDocument" 
                                        className="mr-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                        Attach Document
                                    </label>
                                    
                                    <input
                                        type="file"
                                        id="messageImage"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => setSelectedImage(e.target.files ? e.target.files[0] : null)}
                                    />
                                    <label 
                                        htmlFor="messageImage" 
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                        Attach Image
                                    </label>
                                </div>

                                {/* Selected File Names */}
                                <div className="mb-4">
                                    {selectedDocument && (
                                        <div className="text-sm text-gray-600 dark:text-gray-300">
                                            Document: {selectedDocument.name}
                                        </div>
                                    )}
                                    {selectedImage && (
                                        <div className="text-sm text-gray-600 dark:text-gray-300">
                                            Image: {selectedImage.name}
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end">
                                    <Button 
                                        onClick={addMessage}
                                        disabled={!newMessage.message.trim()}
                                        className="w-full"
                                    >
                                        Add Message
                                    </Button>
                                </div>
                            </div>

                            {/* Messages List */}
                            <div className="space-y-4">
                                {messages.length > 0 ? (
                                    Object.entries(
                                        messages.reduce((acc, message) => {
                                            const day = message.dayNumber || 1;
                                            if (!acc[day]) {
                                                acc[day] = [];
                                            }
                                            acc[day].push(message);
                                            return acc;
                                        }, {} as Record<number, FollowUpMessage[]>)
                                    )
                                    .sort(([dayA], [dayB]) => Number(dayA) - Number(dayB))
                                    .map(([day, dayMessages]) => (
                                        <div key={day} className="border rounded-lg p-4">
                                            <h4 className="text-lg font-semibold mb-4">Day {day}</h4>
                                            <div className="space-y-4">
                                                {dayMessages
                                                    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                                                    .map((message: FollowUpMessage, index: number) => (
                                                        <div key={message.id} className="border-l-4 border-primary pl-4">
                                                            {isEditingMessage === message.id ? (
                                                                <div className="space-y-4">
                                                                    {/* Message Input */}
                                                                    <input
                                                                        className="w-full px-4 py-2 border rounded-lg"
                                                                        placeholder="Enter message"
                                                                        value={editingMessage?.message || ''}
                                                                        onChange={(e) => setEditingMessage({
                                                                            ...editingMessage!,
                                                                            message: e.target.value
                                                                        })}
                                                                    />
                                                                    
                                                                    {/* Delay Settings */}
                                                                    <div className="space-y-2">
                                                                        <label className="flex items-center">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="mr-2"
                                                                                checked={editingMessage?.delayAfter?.isInstantaneous || false}
                                                                                onChange={(e) => setEditingMessage({
                                                                                    ...editingMessage!,
                                                                                    delayAfter: {
                                                                                        ...editingMessage!.delayAfter,
                                                                                        isInstantaneous: e.target.checked
                                                                                    }
                                                                                })}
                                                                            />
                                                                            Send immediately after previous message
                                                                        </label>
                                                                                
                                                                        {!editingMessage?.delayAfter?.isInstantaneous && (
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="number"
                                                                                    className="w-24 px-4 py-2 border rounded-lg"
                                                                                    value={editingMessage?.delayAfter?.value || 0}
                                                                                    onChange={(e) => setEditingMessage({
                                                                                        ...editingMessage!,
                                                                                        delayAfter: {
                                                                                            ...editingMessage!.delayAfter,
                                                                                            value: parseInt(e.target.value) || 0
                                                                                        }
                                                                                    })}
                                                                                    min="0"
                                                                                />
                                                                                <select
                                                                                    className="px-4 py-2 border rounded-lg"
                                                                                    value={editingMessage?.delayAfter?.unit || 'minutes'}
                                                                                    onChange={(e) => setEditingMessage({
                                                                                        ...editingMessage!,
                                                                                        delayAfter: {
                                                                                            ...editingMessage!.delayAfter,
                                                                                            unit: e.target.value as 'minutes' | 'hours' | 'days'
                                                                                        }
                                                                                    })}
                                                                                >
                                                                                    <option value="minutes">Minutes</option>
                                                                                    <option value="hours">Hours</option>
                                                                                    <option value="days">Days</option>
                                                                                </select>
                                                                                <span>after previous message</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Specific Numbers Edit */}
                                                                    <div className="space-y-2">
                                                                        <label className="flex items-center">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="mr-2"
                                                                                checked={editingMessage?.specificNumbers?.enabled || false}
                                                                                onChange={(e) => setEditingMessage({
                                                                                    ...editingMessage!,
                                                                                    specificNumbers: {
                                                                                        numbers: editingMessage?.specificNumbers?.numbers || [],
                                                                                        enabled: e.target.checked
                                                                                    }
                                                                                })}
                                                                            />
                                                                            Send to specific numbers
                                                                        </label>
                                                                            
                                                                        {editingMessage?.specificNumbers?.enabled && (
                                                                            <div className="space-y-2">
                                                                                <div className="flex gap-2">
                                                                                    <input
                                                                                        type="text"
                                                                                        className="flex-1 px-4 py-2 border rounded-lg"
                                                                                        placeholder="Enter phone number"
                                                                                        value={newNumber}
                                                                                        onChange={(e) => setNewNumber(e.target.value)}
                                                                                    />
                                                                                    <Button
                                                                                        onClick={() => {
                                                                                            if (newNumber.trim()) {
                                                                                                setEditingMessage({
                                                                                                    ...editingMessage!,
                                                                                                    specificNumbers: {
                                                                                                        ...editingMessage!.specificNumbers!,
                                                                                                        numbers: [...(editingMessage!.specificNumbers?.numbers || []), newNumber.trim()]
                                                                                                    }
                                                                                                });
                                                                                                setNewNumber('');
        }
    }}
>
    Add
</Button>
</div>

{/* Display added numbers */}
<div className="space-y-1">
{editingMessage?.specificNumbers?.numbers.map((number, index) => (
    <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
        <span>{number}</span>
        <button
            onClick={() => {
                                                                                                    const updatedNumbers = [...editingMessage.specificNumbers!.numbers];
                                                                                                    updatedNumbers.splice(index, 1);
                                                                                                    setEditingMessage({
                                                                                                        ...editingMessage,
                                                                                                        specificNumbers: {
                                                                                                            ...editingMessage.specificNumbers!,
                                                                                                            numbers: updatedNumbers
                                                                                                        }
                                                                                                    });
                                                                                                }}
                                                                                                className="text-red-500 hover:text-red-700"
            >
                                                                                                ✕
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Document and Image Upload */}
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="file"
                                                                            id={`editDocument-${message.id}`}
                                                                            className="hidden"
                                                                            onChange={(e) => setSelectedDocument(e.target.files?.[0] || null)}
                                                                        />
                                                                        <label
                                                                            htmlFor={`editDocument-${message.id}`}
                                                                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
                                                                        >
                                                                            {editingMessage?.document ? 'Change Document' : 'Add Document'}
                                                                        </label>

                                                                        <input
                                                                            type="file"
                                                                            id={`editImage-${message.id}`}
                                                                            className="hidden"
                                                                            accept="image/*"
                                                                            onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                                                                        />
                                                                        <label
                                                                            htmlFor={`editImage-${message.id}`}
                                                                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
                                                                        >
                                                                            {editingMessage?.image ? 'Change Image' : 'Add Image'}
                                                                        </label>
                                                                    </div>

                                                                    {/* Selected Files Display */}
                                                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                                                        {selectedDocument && (
                                                                            <div className="flex items-center gap-2">
                                                                                <span>New Document: {selectedDocument.name}</span>
                                                                                <button
                                                                                    onClick={() => setSelectedDocument(null)}
                                                                                    className="text-red-500 hover:text-red-700"
                                                                                >
                                                                                    ✕
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                        {selectedImage && (
                                                                            <div className="flex items-center gap-2">
                                                                                <span>New Image: {selectedImage.name}</span>
                                                                                <button
                                                                                    onClick={() => setSelectedImage(null)}
                                                                                    className="text-red-500 hover:text-red-700"
                                                                                >
                                                                                    ✕
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Current Files Display */}
                                                                    <div className="space-y-2">
                                                                        {editingMessage?.document && !selectedDocument && (
                                                                            <div className="flex items-center gap-2">
                                                                                <a
                                                                                    href={editingMessage.document}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-primary hover:underline"
                                                                                >
                                                                                    Current Document
                                                                                </a>
                                                                                <button
                                                                                    onClick={() => setEditingMessage({
                                                                                        ...editingMessage,
                                                                                        document: null
                                                                                    })}
                                                                                    className="text-red-500 hover:text-red-700"
                                                                                >
                                                                                    Remove
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                        {editingMessage?.image && !selectedImage && (
                                                                            <div className="flex flex-col gap-2">
                                                                                <img
                                                                                    src={editingMessage.image}
                                                                                    alt="Current Image"
                                                                                    className="rounded-lg cursor-pointer max-h-48 object-contain"
                                                                                    onClick={() => window.open(editingMessage.image!, '_blank')}
                                                                                />
                                                                                <button
                                                                                    onClick={() => setEditingMessage({
                                                                                        ...editingMessage,
                                                                                        image: null
                                                                                    })}
                                                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                                                >
                                                                                    Remove Image
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Action Buttons */}
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button 
                                                                            onClick={() => {
                                                                                setIsEditingMessage(null);
                                                                                setEditingMessage(null);
                                                                                setSelectedDocument(null);
                                                                                setSelectedImage(null);
                                                                            }}
                                                                            className="text-white bg-gray-500 hover:bg-gray-600"
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                        <Button 
                                                                            onClick={() => updateMessage(message.id)}
                                                                            disabled={!editingMessage?.message.trim()}
                                                                            className="text-white bg-primary hover:bg-primary-dark"
                                                                        >
                                                                            Save Changes
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <p className="text-sm text-gray-500">Message {message.sequence}</p>
                                                                            <p className="mt-1">{message.message}</p>
                                                                            {index > 0 && (
                                                                                <p className="text-sm text-gray-500 mt-1">
                                                                                    {message.delayAfter.isInstantaneous ? (
                                                                                        'Sends immediately after previous message'
                                                                                    ) : (
                                                                                        `${message.delayAfter.value} ${message.delayAfter.unit} after previous message`
                                                                                    )}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <Button
                                                                                onClick={() => {
                                                                                    setIsEditingMessage(message.id);
                                                                                    setEditingMessage(message);
                                                                                }}
                                                                                className="text-white bg-primary hover:bg-primary-dark"
                                                                            >
                                                                                Edit
                                                                            </Button>
                                                                            <Button 
                                                                                onClick={() => {    
                                                                                    if (window.confirm('Are you sure you want to delete this message?')) {
                                                                                        deleteMessage(message.id);
                                                                                    }
                                                                                }}
                                                                                className="text-white bg-red-500 hover:bg-red-600"
                                                                            >
                                                                                Delete
                                                                            </Button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Document and Image Preview */}
                                                                    {message.document && (
                                                                        <div className="mt-2">
                                                                            <a
                                                                                href={message.document}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-blue-500 hover:underline"
                                                                            >
                                                                                View Document
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                    {message.image && (
                                                                        <div className="mt-2">
                                                                            <img
                                                                                src={message.image}
                                                                                alt="Message Image"
                                                                                className="rounded-lg cursor-pointer max-h-48 object-contain"
                                                                                onClick={() => window.open(message.image!, '_blank')}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center">No messages yet. Add your first message above.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FollowUpsPage;
