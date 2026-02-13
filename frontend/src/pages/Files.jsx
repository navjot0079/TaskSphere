import { useState, useEffect, useRef } from 'react';
import { Upload, Download, Trash2, File, Image, FileText, Search, Grid3x3, List, Eye, Link as LinkIcon, X, Music, Video, Archive, Code } from 'lucide-react';
import { fileAPI } from '../services/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { formatFileSize, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const Files = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [selectedFile, setSelectedFile] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const [imageUrls, setImageUrls] = useState({}); // Store blob URLs for images
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchFiles();

        // Cleanup blob URLs on unmount
        return () => {
            Object.values(imageUrls).forEach(url => {
                if (url) URL.revokeObjectURL(url);
            });
        };
    }, []);

    const fetchFiles = async () => {
        try {
            const { data } = await fileAPI.getFiles();
            setFiles(data.files);
            // Load image previews
            data.files.forEach(file => {
                if (file.mimeType.startsWith('image/')) {
                    loadImagePreview(file._id);
                }
            });
        } catch (error) {
            toast.error('Failed to load files');
        } finally {
            setLoading(false);
        }
    };

    const loadImagePreview = async (fileId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/files/${fileId}/view`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                setImageUrls(prev => ({ ...prev, [fileId]: url }));
            }
        } catch (error) {
            console.error('Failed to load image preview:', error);
        }
    };

    const handleUpload = async (file) => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            await fileAPI.uploadFile(formData);
            toast.success('File uploaded successfully!');
            fetchFiles();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        handleUpload(file);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files[0]);
        }
    };

    const handleDownload = async (file) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/files/${file._id}/download`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.originalName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Download started');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download file');
        }
    };

    const handlePreview = async (file) => {
        // Load preview if not already loaded
        if ((file.mimeType.startsWith('image/') || file.mimeType.includes('pdf')) && !imageUrls[file._id]) {
            await loadImagePreview(file._id);
        }
        setSelectedFile(file);
        setShowPreview(true);
    };

    const handleCopyLink = (file) => {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const link = `${baseUrl}/api/files/${file._id}/view`;
        navigator.clipboard.writeText(link);
        toast.success('Link copied to clipboard (requires authentication)');
    };

    const handleDelete = async (fileId) => {
        if (!confirm('Are you sure you want to delete this file?')) return;

        try {
            await fileAPI.deleteFile(fileId);
            toast.success('File deleted successfully');
            fetchFiles();
        } catch (error) {
            toast.error('Failed to delete file');
        }
    };

    const getFileIcon = (mimeType) => {
        if (mimeType.startsWith('image/')) return <Image className="w-8 h-8" />;
        if (mimeType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
        if (mimeType.startsWith('video/')) return <Video className="w-8 h-8 text-purple-500" />;
        if (mimeType.startsWith('audio/')) return <Music className="w-8 h-8 text-green-500" />;
        if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive className="w-8 h-8 text-yellow-500" />;
        if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css')) return <Code className="w-8 h-8 text-blue-500" />;
        return <File className="w-8 h-8 text-gray-500" />;
    };

    const getFileTypeCategory = (mimeType) => {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.includes('pdf')) return 'document';
        return 'other';
    };

    const filteredFiles = files.filter(file => {
        const matchesSearch = file.originalName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || getFileTypeCategory(file.mimeType) === filterType;
        return matchesSearch && matchesType;
    });

    const getFileTypeColor = (mimeType) => {
        if (mimeType.startsWith('image/')) return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
        if (mimeType.includes('pdf')) return 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400';
        if (mimeType.startsWith('video/')) return 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';
        if (mimeType.startsWith('audio/')) return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400';
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Files</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Manage and organize your files
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileInput}
                        disabled={uploading}
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        icon={<Upload className="w-5 h-5" />}
                        disabled={uploading}
                    >
                        {uploading ? 'Uploading...' : 'Upload File'}
                    </Button>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <Card>
                <div className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search files..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Filter */}
                        <div className="flex items-center gap-2">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                <option value="all">All Files</option>
                                <option value="image">Images</option>
                                <option value="document">Documents</option>
                                <option value="video">Videos</option>
                                <option value="audio">Audio</option>
                                <option value="other">Other</option>
                            </select>

                            {/* View Toggle */}
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
                                    title="Grid view"
                                >
                                    <Grid3x3 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
                                    title="List view"
                                >
                                    <List className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{filteredFiles.length} files</span>
                        <span>•</span>
                        <span>{formatFileSize(filteredFiles.reduce((acc, file) => acc + file.fileSize, 0))} total</span>
                    </div>
                </div>
            </Card>

            {/* Drag and Drop Area */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg transition-colors ${dragActive
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                    : 'border-gray-300 dark:border-gray-700'
                    }`}
            >
                {dragActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary-50 dark:bg-primary-900/20 rounded-lg z-10">
                        <div className="text-center">
                            <Upload className="w-12 h-12 text-primary-600 mx-auto mb-2" />
                            <p className="text-lg font-medium text-primary-600">Drop file here to upload</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div className="text-center py-12">
                        <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            {searchQuery || filterType !== 'all' ? 'No files found' : 'No files yet'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {searchQuery || filterType !== 'all'
                                ? 'Try adjusting your search or filter'
                                : 'Upload your first file or drag and drop here'}
                        </p>
                        {!searchQuery && filterType === 'all' && (
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                icon={<Upload className="w-5 h-5" />}
                            >
                                Upload File
                            </Button>
                        )}
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                        <AnimatePresence>
                            {filteredFiles.map((file) => (
                                <motion.div
                                    key={file._id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Card hover className="group">
                                        <div className="p-4">
                                            {/* File Preview/Icon */}
                                            <div className={`relative flex items-center justify-center mb-3 p-6 rounded-lg ${getFileTypeColor(file.mimeType)}`}>
                                                {file.mimeType.startsWith('image/') && imageUrls[file._id] ? (
                                                    <img
                                                        src={imageUrls[file._id]}
                                                        alt={file.originalName}
                                                        className="w-full h-32 object-cover rounded"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div style={file.mimeType.startsWith('image/') && imageUrls[file._id] ? { display: 'none' } : {}} className="flex items-center justify-center">
                                                    {getFileIcon(file.mimeType)}
                                                </div>
                                            </div>

                                            {/* File Info */}
                                            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate mb-1" title={file.originalName}>
                                                {file.originalName}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                                {formatFileSize(file.fileSize)} • {formatDate(file.uploadDate || file.createdAt)}
                                            </p>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {(file.mimeType.startsWith('image/') || file.mimeType.includes('pdf')) && (
                                                    <button
                                                        onClick={() => handlePreview(file)}
                                                        className="flex-1 py-1.5 px-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                                                        title="Preview"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDownload(file)}
                                                    className="flex-1 py-1.5 px-2 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                                                    title="Download"
                                                >
                                                    <Download className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleCopyLink(file)}
                                                    className="flex-1 py-1.5 px-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                                                    title="Copy link"
                                                >
                                                    <LinkIcon className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(file._id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="p-4">
                        <div className="space-y-2">
                            {filteredFiles.map((file) => (
                                <motion.div
                                    key={file._id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                                >
                                    <div className={`p-2 rounded ${getFileTypeColor(file.mimeType)}`}>
                                        {getFileIcon(file.mimeType)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {file.originalName}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatFileSize(file.fileSize)} • {formatDate(file.uploadDate || file.createdAt)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {(file.mimeType.startsWith('image/') || file.mimeType.includes('pdf')) && (
                                            <button
                                                onClick={() => handlePreview(file)}
                                                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                                title="Preview"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDownload(file)}
                                            className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                                            title="Download"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleCopyLink(file)}
                                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                            title="Copy link"
                                        >
                                            <LinkIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(file._id)}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            <Modal
                isOpen={showPreview}
                onClose={() => {
                    setShowPreview(false);
                    setSelectedFile(null);
                }}
                title={selectedFile?.originalName || 'File Preview'}
                size="xl"
            >
                {selectedFile && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                            {selectedFile.mimeType.startsWith('image/') ? (
                                imageUrls[selectedFile._id] ? (
                                    <img
                                        src={imageUrls[selectedFile._id]}
                                        alt={selectedFile.originalName}
                                        className="max-w-full max-h-[500px] object-contain rounded"
                                    />
                                ) : (
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                                        <p className="text-gray-600 dark:text-gray-400">Loading image...</p>
                                    </div>
                                )
                            ) : selectedFile.mimeType.includes('pdf') ? (
                                imageUrls[selectedFile._id] ? (
                                    <iframe
                                        src={imageUrls[selectedFile._id]}
                                        className="w-full h-[500px] rounded"
                                        title={selectedFile.originalName}
                                    />
                                ) : (
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                                        <p className="text-gray-600 dark:text-gray-400">Loading PDF...</p>
                                    </div>
                                )
                            ) : (
                                <div className="text-center">
                                    <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 dark:text-gray-400">Preview not available for this file type</p>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Size: {formatFileSize(selectedFile.fileSize)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Uploaded: {formatDate(selectedFile.uploadDate || selectedFile.createdAt)}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => handleCopyLink(selectedFile)}
                                    icon={<LinkIcon className="w-4 h-4" />}
                                >
                                    Copy Link
                                </Button>
                                <Button
                                    onClick={() => handleDownload(selectedFile)}
                                    icon={<Download className="w-4 h-4" />}
                                >
                                    Download
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Files;
