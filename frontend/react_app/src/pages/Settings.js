
import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { Save, Upload, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
    const { settings, updateSettings } = useSettings();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        site_name: '',
        site_caption: '',
    });
    const [logoFile, setLogoFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (settings) {
            setFormData({
                site_name: settings.site_name || '',
                site_caption: settings.site_caption || '',
            });
        }
    }, [settings]);

    if (user?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Access Denied</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Only administrators can modify system settings.</p>
            </div>
        );
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setLogoFile(e.target.files[0]);
    };

    const handleRemoveLogo = async () => {
        if (!window.confirm('Are you sure you want to remove the current logo?')) return;
        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('remove_logo', 'true');
            await updateSettings(data);
            toast.success('Logo removed successfully');
            setLogoFile(null);
        } catch (error) {
            toast.error('Failed to remove logo');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('site_name', formData.site_name);
            data.append('site_caption', formData.site_caption);
            if (logoFile) {
                data.append('logo', logoFile);
            }

            await updateSettings(data);
            toast.success('Settings updated successfully!');
            setLogoFile(null); // Reset file input
        } catch (error) {
            console.error(error);
            toast.error('Failed to update settings.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    System Settings
                </h1>
                <p className="text-gray-500 mt-1">Configure global application identity</p>
            </div>

            <div className="card p-8 shadow-xl">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Branding Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="form-label text-lg">Application Name</label>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Display name shown in header and browser tab.</p>
                                <input
                                    name="site_name"
                                    type="text"
                                    className="form-input text-lg font-medium"
                                    value={formData.site_name}
                                    onChange={handleChange}
                                    placeholder="e.g. EduRFID"
                                />
                            </div>

                            <div>
                                <label className="form-label text-lg">Tagline / Caption</label>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Subtitle shown in the top navigation bar.</p>
                                <input
                                    name="site_caption"
                                    type="text"
                                    className="form-input"
                                    value={formData.site_caption}
                                    onChange={handleChange}
                                    placeholder="e.g. School Attendance System"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-colors relative">
                            <label className="text-center cursor-pointer w-full h-full flex flex-col items-center justify-center group z-10">
                                <div className="w-32 h-32 rounded-full overflow-hidden bg-white shadow-md mb-4 border-4 border-white flex items-center justify-center relative">
                                    {logoFile ? (
                                        <img src={URL.createObjectURL(logoFile)} alt="Preview" className="w-full h-full object-cover" />
                                    ) : settings?.logo ? (
                                        <img src={settings.logo} alt="Current Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-500 font-bold text-4xl">
                                            {formData.site_name.charAt(0) || 'L'}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload className="text-white w-8 h-8" />
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 px-4 py-2 rounded-full shadow-sm border border-gray-200 dark:border-gray-600 group-hover:border-blue-500 transition-colors">
                                    {logoFile ? 'Change File' : 'Upload Logo'}
                                </span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>

                            {(settings?.logo && !logoFile) && (
                                <button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    className="absolute top-4 right-4 z-20 p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                    title="Remove Logo"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}

                            <p className="text-xs text-center text-gray-400 mt-4">Recommended: 200x200px PNG or JPG</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-primary px-8 py-3 text-lg flex items-center gap-3 shadow-lg hover:shadow-blue-500/25"
                        >
                            {isSubmitting ? <div className="loading-spinner w-5 h-5 border-white"></div> : <Save className="w-5 h-5" />}
                            <span>Save Changes</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
