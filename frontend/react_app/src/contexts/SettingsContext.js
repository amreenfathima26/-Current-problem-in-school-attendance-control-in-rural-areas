import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        site_name: 'EDURFID',
        site_caption: 'School Attendance System',
        logo: null
    });
    const [loading, setLoading] = useState(true);

    const updateFavicon = (logoUrl) => {
        const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = logoUrl || '/favicon.ico';
        document.getElementsByTagName('head')[0].appendChild(link);
    };

    const fetchSettings = async () => {
        try {
            const data = await settingsAPI.getSettings();
            setSettings(data);

            // Update document title and favicon
            if (data.site_name) {
                document.title = data.site_name;
            }
            updateFavicon(data.logo);
        } catch (error) {
            console.error('Failed to load site settings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const updateSettings = async (formData) => {
        const updated = await settingsAPI.updateSettings(formData);
        setSettings(updated);

        if (updated.site_name) {
            document.title = updated.site_name;
        }
        updateFavicon(updated.logo);
        return updated;
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, loading, fetchSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
