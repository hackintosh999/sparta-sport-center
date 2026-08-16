import React, { createContext, useContext, useState, useEffect } from 'react';
import { CityId, City, LocationItem } from '../types/city';
import { CITIES, LOCATIONS_BY_CITY, SPARTA_LOCATIONS } from '../constants/cities';
import { safeLocalStorage } from '../utils/storage';
import { useAuth } from './AuthContext';
import { doc, updateDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

interface CityContextType {
    selectedCity: CityId;
    city: City;
    setCity: (cityId: CityId) => void;
    cities: City[];
    locations: LocationItem[];
    allLocations: LocationItem[];
}

const STORAGE_KEY = 'sparta_selected_city';

const CityContext = createContext<CityContextType | undefined>(undefined);

export const CityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, userProfile } = useAuth();
    const [cities, setCities] = useState<City[]>(CITIES);
    const [dbLocations, setDbLocations] = useState<LocationItem[]>(SPARTA_LOCATIONS);
    const [selectedCity, setSelectedCityState] = useState<CityId>(() => {
        const saved = safeLocalStorage.getItem(STORAGE_KEY) as CityId;
        if (saved && CITIES.some(c => c.id === saved)) return saved;
        return 'chelyabinsk';
    });

    // Listen to dynamic cities from Firestore if created by Admin
    useEffect(() => {
        try {
            const q = query(collection(db, 'cities'), orderBy('sortOrder', 'asc'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    const dynamicCities = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as City[];
                    setCities(dynamicCities);
                }
            }, (err) => {
                console.log("Firestore cities collection fallback to static CITIES", err);
            });
            return () => unsubscribe();
        } catch (e) {
            console.log("CityProvider fallback to static CITIES");
        }
    }, []);

    // Listen to dynamic locations from Firestore
    useEffect(() => {
        try {
            const q = collection(db, 'locations');
            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    const dynamicLocations = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as LocationItem[];
                    setDbLocations(dynamicLocations);
                } else {
                    setDbLocations(SPARTA_LOCATIONS);
                }
            }, (err) => {
                console.log("Firestore locations collection fallback", err);
            });
            return () => unsubscribe();
        } catch (e) {
            console.log("CityProvider fallback to SPARTA_LOCATIONS");
        }
    }, []);

    // Sync with logged-in user profile preference
    useEffect(() => {
        if (userProfile?.cityId && CITIES.some(c => c.id === userProfile.cityId)) {
            setSelectedCityState(userProfile.cityId as CityId);
            safeLocalStorage.setItem(STORAGE_KEY, userProfile.cityId);
        }
    }, [userProfile?.cityId]);

    const setCity = React.useCallback((cityId: CityId) => {
        setSelectedCityState(cityId);
        safeLocalStorage.setItem(STORAGE_KEY, cityId);

        if (user?.uid) {
            updateDoc(doc(db, "users", user.uid), { cityId }).catch(console.error);
        }
    }, [user?.uid]);

    const currentCity = React.useMemo(() => {
        return cities.find(c => c.id === selectedCity) || CITIES[0];
    }, [cities, selectedCity]);
    
    // Merge Firestore dynamic updates into SPARTA_LOCATIONS by ID
    const visibleLocations = React.useMemo(() => {
        const mergedLocations = SPARTA_LOCATIONS.map(staticLoc => {
            const dbMatch = dbLocations.find(d => d.id === staticLoc.id);
            return dbMatch ? { ...staticLoc, ...dbMatch } : staticLoc;
        });

        // Combine with any brand-new locations created in Firestore
        const newDbLocations = dbLocations.filter(d => !SPARTA_LOCATIONS.some(s => s.id === d.id));
        const allCombinedLocations = [...mergedLocations, ...newDbLocations];

        // Strictly filter out hidden locations (status === 'hidden')
        return allCombinedLocations.filter(l => l.status !== 'hidden');
    }, [dbLocations]);

    // Match locations by cityId or city name
    const safeLocations = React.useMemo(() => {
        const cityLocations = visibleLocations.filter(l => 
            !l.cityId || 
            l.cityId === selectedCity || 
            l.cityId === 'all' || 
            (l.city && l.city.toLowerCase().includes(currentCity.name.toLowerCase()))
        );

        // Safe fallback: guarantee counter is never 0 if visible locations exist
        return cityLocations.length > 0 ? cityLocations : visibleLocations;
    }, [visibleLocations, selectedCity, currentCity]);

    const contextValue = React.useMemo(() => ({
        selectedCity,
        city: currentCity,
        setCity,
        cities,
        locations: safeLocations,
        allLocations: visibleLocations
    }), [
        selectedCity,
        currentCity,
        setCity,
        cities,
        safeLocations,
        visibleLocations
    ]);

    return (
        <CityContext.Provider value={contextValue}>
            {children}
        </CityContext.Provider>
    );
};

export const useCity = () => {
    const ctx = useContext(CityContext);
    if (!ctx) {
        // Fallback for safety if rendered outside provider
        return {
            selectedCity: 'chelyabinsk',
            city: CITIES[0],
            setCity: () => {},
            cities: CITIES,
            locations: LOCATIONS_BY_CITY['chelyabinsk'] || [],
            allLocations: SPARTA_LOCATIONS
        };
    }
    return ctx;
};
