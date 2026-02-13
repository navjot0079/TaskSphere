import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, CheckCircle, Trash2 } from 'lucide-react';
import { projectAPI } from '../services/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { formatDate } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Projects = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const { data } = await projectAPI.getProjects();
            setProjects(data.projects);
        } catch (error) {
            toast.error('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();

        // Clear previous errors
        setErrors({});

        // Validation
        const newErrors = {};

        if (!formData.name || !formData.name.trim()) {
            newErrors.name = 'Project name is required';
        } else if (formData.name.trim().length < 3) {
            newErrors.name = 'Project name must be at least 3 characters';
        } else if (formData.name.trim().length > 100) {
            newErrors.name = 'Project name cannot exceed 100 characters';
        }

        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            if (end < start) {
                newErrors.endDate = 'End date must be after start date';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('Please fix the validation errors');
            return;
        }

        try {
            await projectAPI.createProject(formData);
            toast.success('Project created successfully!');
            setShowModal(false);
            setFormData({ name: '', description: '', startDate: '', endDate: '' });
            setErrors({});
            fetchProjects();
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to create project';
            toast.error(errorMessage);
            console.error('Create project error:', error);
        }
    };

    const handleDeleteClick = (e, project) => {
        e.stopPropagation();
        setProjectToDelete(project);
        setDeleteModal(true);
    };

    const handleDeleteProject = async () => {
        try {
            await projectAPI.deleteProject(projectToDelete._id);
            toast.success('Project deleted successfully!');
            setDeleteModal(false);
            setProjectToDelete(null);
            fetchProjects();
        } catch (error) {
            toast.error('Failed to delete project');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Manage your team projects
                    </p>
                </div>
                <Button onClick={() => setShowModal(true)} icon={<Plus className="w-5 h-5" />}>
                    New Project
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <Card
                            key={project._id}
                            hover
                            className="cursor-pointer relative group"
                            onClick={() => navigate(`/projects/${project._id}`)}
                        >
                            <div className="p-6">
                                {(user?.role === 'admin' || project.owner?._id === user?._id) && (
                                    <button
                                        onClick={(e) => handleDeleteClick(e, project)}
                                        className="absolute top-4 right-4 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 opacity-0 group-hover:opacity-100 transition-all z-10"
                                        title="Delete project"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                    {project.name}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                    {project.description}
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Progress</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {project.progress || 0}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-primary-600 h-2 rounded-full transition-all"
                                            style={{ width: `${project.progress || 0}%` }}
                                        ></div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                            <Users className="w-4 h-4 mr-1" />
                                            {project.members?.length || 0} members
                                        </div>
                                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                            {project.taskCount || 0} tasks
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setErrors({});
                    setFormData({ name: '', description: '', startDate: '', endDate: '' });
                }}
                title="Create New Project"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => {
                            setShowModal(false);
                            setErrors({});
                            setFormData({ name: '', description: '', startDate: '', endDate: '' });
                        }}>
                            Cancel
                        </Button>
                        <Button type="submit" form="create-project-form">Create Project</Button>
                    </>
                }
            >
                <form id="create-project-form" onSubmit={handleCreateProject} className="space-y-4">
                    <div>
                        <Input
                            label="Project Name"
                            value={formData.name}
                            onChange={(e) => {
                                setFormData({ ...formData, name: e.target.value });
                                if (errors.name) {
                                    setErrors({ ...errors, name: '' });
                                }
                            }}
                            placeholder="Enter project name"
                        />
                        {errors.name && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                        )}
                    </div>
                    <Textarea
                        label="Description (optional)"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Enter project description"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Input
                                label="Start Date (optional)"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <Input
                                label="End Date (optional)"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => {
                                    setFormData({ ...formData, endDate: e.target.value });
                                    if (errors.endDate) {
                                        setErrors({ ...errors, endDate: '' });
                                    }
                                }}
                            />
                            {errors.endDate && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endDate}</p>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModal}
                onClose={() => {
                    setDeleteModal(false);
                    setProjectToDelete(null);
                }}
                title="Delete Project"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setDeleteModal(false);
                                setProjectToDelete(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDeleteProject}
                        >
                            Delete Project
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">
                        Are you sure you want to delete the project <strong>"{projectToDelete?.name}"</strong>?
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                        ⚠️ This action cannot be undone. All tasks and data associated with this project will be permanently deleted.
                    </p>
                </div>
            </Modal>
        </div>
    );
};

export default Projects;
