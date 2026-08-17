import { db } from '../firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    where
} from 'firebase/firestore';

// Multi-Protocol ICE/STUN/TURNS Configuration (Bypasses VPNs, Corporate Firewalls, 4G/5G NAT)
const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:stun.services.mozilla.com' },
        { urls: 'stun:stun.relay.metered.ca:80' },
        // Standard TURN over UDP & TCP
        {
            urls: [
                'turn:standard.relay.metered.ca:80',
                'turn:standard.relay.metered.ca:80?transport=tcp',
                'turn:standard.relay.metered.ca:443',
                'turn:standard.relay.metered.ca:443?transport=tcp'
            ],
            username: 'e8c45995777178cf23ee8fcf',
            credential: 'XvJ19z5+oBvP9s/c'
        },
        // TURNS over TLS/HTTPS Port 443 (100% VPN & Firewall Bypass)
        {
            urls: [
                'turns:standard.relay.metered.ca:443?transport=tcp',
                'turns:standard.relay.metered.ca:5349?transport=tcp'
            ],
            username: 'e8c45995777178cf23ee8fcf',
            credential: 'XvJ19z5+oBvP9s/c'
        }
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all'
};

export class SpartaStreamBroadcaster {
    private localStream: MediaStream | null = null;
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
    private roomId: string;
    private cameraId: string;
    private cameraLabel: string;
    private unsubscribeViewers: (() => void) | null = null;

    constructor(roomId: string, cameraId: string = 'cam_main', cameraLabel: string = 'Камера 1 (Основная)') {
        this.roomId = roomId;
        this.cameraId = cameraId;
        this.cameraLabel = cameraLabel;
    }

    async startCamera(videoElement: HTMLVideoElement, facingMode: 'user' | 'environment' = 'environment'): Promise<MediaStream> {
        try {
            if (this.localStream) {
                this.localStream.getTracks().forEach(t => t.stop());
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: { ideal: facingMode },
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 30, max: 60 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.localStream = stream;
            videoElement.srcObject = stream;
            videoElement.muted = true;
            await videoElement.play().catch(() => {});

            // Register camera node in Firestore
            await setDoc(doc(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId), {
                id: this.cameraId,
                label: this.cameraLabel,
                isActive: true,
                facingMode,
                isVideoOff: false,
                isMuted: false,
                updatedAt: serverTimestamp()
            });

            // If this is the main camera, ensure room doc is created/updated
            if (this.cameraId === 'cam_main') {
                await setDoc(doc(db, 'sparta_live_rooms', this.roomId), {
                    id: this.roomId,
                    isBroadcasting: true,
                    activeCameraId: 'cam_main',
                    startedAt: serverTimestamp()
                }, { merge: true });
            }

            this.listenForViewerJoinRequests();
            return stream;
        } catch (err: any) {
            console.error('Failed to access camera/mic:', err);
            throw new Error(`Не удалось подключить камеру: ${err.message || 'Разрешите доступ к камере'}`);
        }
    }

    private listenForViewerJoinRequests() {
        if (this.unsubscribeViewers) {
            this.unsubscribeViewers();
        }

        const requestsCol = collection(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId, 'viewer_requests');
        this.unsubscribeViewers = onSnapshot(requestsCol, (snapshot) => {
            snapshot.docs.forEach(async (d) => {
                const viewerId = d.id;
                const data = d.data();
                if (data.type === 'offer_request' && !this.peerConnections.has(viewerId)) {
                    await this.handleNewViewer(viewerId);
                }
            });
        });
    }

    private async handleNewViewer(viewerId: string) {
        if (!this.localStream) return;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        this.peerConnections.set(viewerId, pc);
        this.pendingCandidates.set(viewerId, []);

        this.localStream.getTracks().forEach(track => {
            if (this.localStream) {
                pc.addTrack(track, this.localStream);
            }
        });

        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await addDoc(collection(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId, 'broadcaster_candidates'), {
                    viewerId,
                    candidate: event.candidate.toJSON(),
                    createdAt: serverTimestamp()
                });
            }
        };

        const offer = await pc.createOffer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false
        });
        await pc.setLocalDescription(offer);

        await setDoc(doc(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId, 'offers', viewerId), {
            offer: { type: offer.type, sdp: offer.sdp },
            createdAt: serverTimestamp()
        });

        // Listen for answer from this viewer
        const answerDocRef = doc(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId, 'answers', viewerId);
        const unsubAnswer = onSnapshot(answerDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const answerData = docSnap.data();
                if (answerData.answer && !pc.currentRemoteDescription) {
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(answerData.answer));

                        // Flush buffered candidates
                        const queued = this.pendingCandidates.get(viewerId) || [];
                        for (const cand of queued) {
                            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                        }
                        this.pendingCandidates.delete(viewerId);
                    } catch (e) {
                        console.error('Error setting remote description in broadcaster:', e);
                    }
                }
            }
        });

        // Listen for viewer ICE candidates with viewerId filter and buffering
        const viewerCandidatesQuery = query(
            collection(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId, 'viewer_candidates'),
            where('viewerId', '==', viewerId)
        );
        const unsubCandidates = onSnapshot(viewerCandidatesQuery, async (candSnap) => {
            for (const change of candSnap.docChanges()) {
                if (change.type === 'added') {
                    const candData = change.doc.data();
                    if (candData.candidate) {
                        try {
                            if (pc.remoteDescription) {
                                await pc.addIceCandidate(new RTCIceCandidate(candData.candidate)).catch(() => {});
                            } else {
                                const queue = this.pendingCandidates.get(viewerId) || [];
                                queue.push(candData.candidate);
                                this.pendingCandidates.set(viewerId, queue);
                            }
                        } catch (e) {
                            console.error('Error adding viewer ICE candidate:', e);
                        }
                    }
                }
            }
        });

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                unsubAnswer();
                unsubCandidates();
                this.peerConnections.delete(viewerId);
                this.pendingCandidates.delete(viewerId);
            }
        };
    }

    toggleAudio(enabled: boolean) {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = enabled;
            });
            updateDoc(doc(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId), {
                isMuted: !enabled
            }).catch(() => {});
        }
    }

    toggleVideo(enabled: boolean) {
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => {
                track.enabled = enabled;
            });
            updateDoc(doc(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId), {
                isVideoOff: !enabled
            }).catch(() => {});
        }
    }

    async stopCamera() {
        if (this.unsubscribeViewers) {
            this.unsubscribeViewers();
            this.unsubscribeViewers = null;
        }

        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        this.pendingCandidates.clear();

        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }

        try {
            await deleteDoc(doc(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId));
            if (this.cameraId === 'cam_main') {
                await setDoc(doc(db, 'sparta_live_rooms', this.roomId), {
                    isBroadcasting: false,
                    endedAt: serverTimestamp()
                }, { merge: true });
            }
        } catch (e) {}
    }
}

export class SpartaStreamViewer {
    private pc: RTCPeerConnection | null = null;
    private roomId: string;
    private cameraId: string;
    private viewerId: string;
    private pendingCandidates: RTCIceCandidateInit[] = [];
    private unsubOffer: (() => void) | null = null;
    private unsubBroadcasterCandidates: (() => void) | null = null;
    private retryTimeout: any = null;

    constructor(roomId: string, cameraId: string = 'cam_main') {
        this.roomId = roomId;
        this.cameraId = cameraId;
        this.viewerId = 'v_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    }

    setCamera(newCameraId: string, videoElement: HTMLVideoElement, onConnectionStatus?: (status: string) => void) {
        this.stopWatching();
        this.cameraId = newCameraId;
        this.startWatching(videoElement, onConnectionStatus);
    }

    async startWatching(videoElement: HTMLVideoElement, onConnectionStatus?: (status: string) => void): Promise<void> {
        this.stopWatching();
        this.viewerId = 'v_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
        this.pendingCandidates = [];

        if (onConnectionStatus) onConnectionStatus('connecting');

        const pc = new RTCPeerConnection(ICE_SERVERS);
        this.pc = pc;

        // Ensure video element properties for autoplay
        videoElement.muted = true;
        videoElement.playsInline = true;

        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                videoElement.srcObject = event.streams[0];
                videoElement.muted = true;
                videoElement.play().catch(() => {});
                if (onConnectionStatus) onConnectionStatus('connected');
                if (this.retryTimeout) {
                    clearTimeout(this.retryTimeout);
                    this.retryTimeout = null;
                }
            }
        };

        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await addDoc(collection(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId, 'viewer_candidates'), {
                    viewerId: this.viewerId,
                    candidate: event.candidate.toJSON(),
                    createdAt: serverTimestamp()
                });
            }
        };

        pc.onconnectionstatechange = () => {
            if (onConnectionStatus) onConnectionStatus(pc.connectionState);
            if (pc.connectionState === 'connected' && onConnectionStatus) {
                onConnectionStatus('connected');
            }
        };

        // Send viewer join request to broadcaster for this camera
        await setDoc(doc(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId, 'viewer_requests', this.viewerId), {
            type: 'offer_request',
            joinedAt: serverTimestamp()
        });

        // Listen for offer from broadcaster
        const offerDocRef = doc(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId, 'offers', this.viewerId);
        this.unsubOffer = onSnapshot(offerDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.offer && !pc.currentRemoteDescription) {
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);

                        await setDoc(doc(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId, 'answers', this.viewerId), {
                            answer: { type: answer.type, sdp: answer.sdp },
                            createdAt: serverTimestamp()
                        });

                        // Flush queued candidates
                        for (const cand of this.pendingCandidates) {
                            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
                        }
                        this.pendingCandidates = [];
                    } catch (e) {
                        console.error('Error handling offer in viewer:', e);
                    }
                }
            }
        });

        // Listen for broadcaster ICE candidates with viewerId filter and buffering
        const broadcasterCandidatesQuery = query(
            collection(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId, 'broadcaster_candidates'),
            where('viewerId', '==', this.viewerId)
        );
        this.unsubBroadcasterCandidates = onSnapshot(broadcasterCandidatesQuery, async (candSnap) => {
            for (const change of candSnap.docChanges()) {
                if (change.type === 'added') {
                    const candData = change.doc.data();
                    if (candData.candidate) {
                        try {
                            if (pc.remoteDescription) {
                                await pc.addIceCandidate(new RTCIceCandidate(candData.candidate)).catch(() => {});
                            } else {
                                this.pendingCandidates.push(candData.candidate);
                            }
                        } catch (e) {
                            console.error('Error adding broadcaster candidate in viewer:', e);
                        }
                    }
                }
            }
        });

        // Retry handshake after 4s if still connecting
        this.retryTimeout = setTimeout(() => {
            if (this.pc && this.pc.connectionState !== 'connected') {
                setDoc(doc(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId, 'viewer_requests', this.viewerId), {
                    type: 'offer_request',
                    retry: true,
                    joinedAt: serverTimestamp()
                }).catch(() => {});
            }
        }, 4000);
    }

    stopWatching() {
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
            this.retryTimeout = null;
        }
        if (this.unsubOffer) {
            this.unsubOffer();
            this.unsubOffer = null;
        }
        if (this.unsubBroadcasterCandidates) {
            this.unsubBroadcasterCandidates();
            this.unsubBroadcasterCandidates = null;
        }
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        this.pendingCandidates = [];
        deleteDoc(doc(db, 'sparta_live_rooms', this.roomId, 'cameras', this.cameraId, 'viewer_requests', this.viewerId)).catch(() => {});
    }
}
