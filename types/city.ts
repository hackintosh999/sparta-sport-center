export type CityId = string;

export interface GalleryItem {
    url: string;
    title: string;
}

export interface LocationItem {
    id: string;
    cityId: CityId;
    name: string;
    shortName: string;
    address: string;
    city: string;
    details: string;
    parking: string;
    lat: number;
    lon: number;
    phone?: string;
    badge?: string;
    href?: string;
    imageUrl?: string;
    entrancePhotoUrl?: string;
    gallery?: string[];
    galleryItems?: GalleryItem[];
    yandexPhotoUrl?: string;
    status?: 'active' | 'hidden' | 'archived' | 'coming_soon';
    sortOrder?: number;
}

export interface City {
    id: CityId;
    name: string;
    shortName: string;
    status: 'active' | 'coming_soon';
    sortOrder?: number;
    halls?: LocationItem[];
    isDefault?: boolean;
}
