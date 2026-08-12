import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Check, Trash2, FileUp, AlertCircle, RefreshCw, FileText, Eye, ArrowLeft, Plus, Search, CheckCircle2, PartyPopper, Users, UserPlus, Eraser } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Group } from '../../types/shop';

export interface ImportRow {
    id: string;
    selected: boolean;
    childName: string;
    parentName?: string;
    phone: string;
    age: number | string;
    groupName: string;
    coachName?: string;
}

export interface QueuedFile {
    id: string;
    name: string;
    size: number;
    rows: any[];
    columns: string[];
    skipFirstRow: boolean;
    editableRows: ImportRow[];
}

interface ExcelImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    rawRows: any[];
    columns: string[];
    existingGroups: Group[];
    existingPhones?: string[];
    onConfirmImport: (mappedRows: ImportRow[]) => Promise<void>;
    processing: boolean;
    onFileLoaded?: (rows: any[], cols: string[]) => void;
}

const toTitleCase = (str: string) => {
    if (!str) return '';
    const cleanStr = str.replace(/\s+/g, ' ').trim();
    return cleanStr.replace(/\b[\wА-ЯЁа-яё]+/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

const parseSpartaExcel = (fileBuffer: ArrayBuffer, fileName: string) => {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const parsedStudents: any[] = [];

    workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;

        let groupName = sheetName.trim();
        if (/^sheet\d+$/i.test(groupName)) {
            groupName = 'Без группы';
        }

        const objectRows: any[] = XLSX.utils.sheet_to_json(sheet);
        const arrayRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (objectRows && objectRows.length > 0) {
            console.log('--- EXCEL HEADERS DETECTED ---', Object.keys(objectRows[0] || {}));
            console.log('--- RAW ROW DATA SAMPLE ---', objectRows[0]);
        }

        if (arrayRows && arrayRows.length > 0) {
            arrayRows.forEach((arrRow, rowIndex) => {
                if (!arrRow || arrRow.length === 0) return;

                const strRow = arrRow.map(c => String(c || '').trim());
                const val0 = strRow[0] || '';
                const val1 = strRow[1] || '';
                const val2 = strRow[2] || '';
                const val3 = strRow[3] || '';

                if (val0 === '№' || val1 === 'ФИ' || val1 === 'ФИО' || val0.startsWith('Группа') || val1.startsWith('Группа')) {
                    return;
                }

                const objRow = objectRows[rowIndex - 1] || objectRows[rowIndex] || {};

                let name = '';
                let phone = '';
                let parentName = '';

                if (typeof objRow === 'object' && objRow !== null) {
                    for (const [key, value] of Object.entries(objRow)) {
                        if (!value) continue;
                        const kLower = key.toLowerCase().replace(/[^a-zа-яё0-9]/g, '');
                        if (
                            kLower.includes('род') ||
                            kLower.includes('представител') ||
                            kLower.includes('мама') ||
                            kLower.includes('папа') ||
                            kLower.includes('parent') ||
                            kLower.includes('опекун')
                        ) {
                            const valStr = String(value).trim();
                            if (valStr && !/^\+?\d+$/.test(valStr)) {
                                parentName = valStr;
                                break;
                            }
                        }
                    }
                }

                if (val1 && !/^\d+$/.test(val1) && val1 !== '№' && val1 !== 'ФИ') {
                    name = val1;
                    if (!phone) phone = val2;
                    if (!parentName && val3 && !/^\d+$/.test(val3)) parentName = val3;
                } else if (val0 && !/^\d+$/.test(val0) && val0 !== '№') {
                    name = val0;
                    if (!phone) phone = val1;
                    if (!parentName && val2 && !/^\d+$/.test(val2)) parentName = val2;
                } else {
                    strRow.forEach(cellVal => {
                        if (!cellVal || /^\d{1,3}$/.test(cellVal) || cellVal === '№') return;
                        const cleanDigits = cellVal.replace(/\D/g, '');
                        if (cleanDigits.length >= 10) {
                            if (!phone) phone = cellVal;
                        } else if (/^[А-ЯЁа-яёA-Za-z\s-]+$/.test(cellVal) && cellVal.length > 2) {
                            if (!name) {
                                name = cellVal;
                            } else if (!parentName) {
                                parentName = cellVal;
                            }
                        }
                    });
                }

                if (/^\d+$/.test(name) || name === '№' || name === 'ФИ') {
                    name = '';
                }

                let formattedPhone = phone;
                const cleanDigits = phone.replace(/\D/g, '');
                if (cleanDigits.length >= 10) {
                    formattedPhone = `+7 (${cleanDigits.slice(-10, -7)}) ${cleanDigits.slice(-7, -4)}-${cleanDigits.slice(-4, -2)}-${cleanDigits.slice(-2)}`;
                }

                if (name.trim().length > 0) {
                    parsedStudents.push({
                        id: `${fileName}-${sheetName}-${rowIndex}`,
                        childName: toTitleCase(name),
                        name: toTitleCase(name),
                        phone: formattedPhone,
                        parentName: parentName.trim(),
                        groupName: groupName,
                        sourceFile: fileName,
                        raw: objRow,
                        checked: true
                    });
                }
            });
        }
    });

    console.log(`Parsed Sparta Excel [${fileName}]:`, parsedStudents);
    return parsedStudents;
};

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
    isOpen,
    onClose,
    rawRows: initialRawRows,
    existingGroups,
    existingPhones = [],
    onConfirmImport,
    processing
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [uploadedFiles, setUploadedFiles] = useState<QueuedFile[]>([]);
    const [activePreviewFileId, setActivePreviewFileId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterGroup, setFilterGroup] = useState('ALL');
    const [batchSelectGroup, setBatchSelectGroup] = useState('');
    const [batchCustomGroup, setBatchCustomGroup] = useState('');
    const [isImportSuccess, setIsImportSuccess] = useState(false);
    const [importedSuccessCount, setImportedSuccessCount] = useState(0);
    const [importedGroupsCount, setImportedGroupsCount] = useState(0);

    useEffect(() => {
        if (initialRawRows && initialRawRows.length > 0 && uploadedFiles.length === 0) {
            addFileToQueue('Импортированный файл.xlsx', 0, initialRawRows);
        }
    }, [initialRawRows]);

const findParentValue = (row: Record<string, any>) => {
    if (!row || typeof row !== 'object') return '';
    const keys = Object.keys(row);
    const parentKey = keys.find(k => {
        const cleanKey = k.toLowerCase().trim();
        return cleanKey.includes('род') || 
               cleanKey.includes('представител') || 
               cleanKey.includes('мама') || 
               cleanKey.includes('папа') || 
               cleanKey.includes('заметка') ||
               cleanKey.includes('fio') ||
               cleanKey.includes('фио');
    });
    return parentKey ? String(row[parentKey]).trim() : '';
};

    const addFileToQueue = (fileName: string, fileSize: number, rawData: any[]) => {
        const normalize = (val: any) => val ? String(val).trim() : '';

        const editableRows: ImportRow[] = rawData.map((s: any, idx: number) => {
            const rawChildName = normalize(s.name || s.childName || s['ФИО Ученика'] || s['ФИО'] || '');
            const childName = toTitleCase(rawChildName);
            const phone = normalize(s.phone || s['Телефон'] || '');
            const parentName = normalize(s.parentName || s.rawParentName || findParentValue(s.raw || s) || findParentValue(s) || '');
            const age = normalize(s.age || s.childAge || '');
            const groupName = normalize(s.groupName || s['Группа']) || 'Без группы';

            const isValidName = childName.length > 0 && !/^\d+$/.test(childName) && childName !== '№';
            const isSelected = s.checked !== undefined ? s.checked : isValidName;

            return {
                id: s.id || `row_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
                selected: isSelected,
                childName: isValidName ? childName : '',
                phone,
                age,
                parentName,
                groupName,
                coachName: '',
                raw: s
            };
        });

        const newFile: QueuedFile = {
            id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: fileName,
            size: fileSize,
            rows: rawData,
            columns: ['ФИО Ученика', 'Телефон', 'Родитель / Заметка', 'Группа'],
            skipFirstRow: false,
            editableRows
        };

        setUploadedFiles(prev => [...prev, newFile]);
    };

    const parseSelectedFile = (file: File) => {
        setParseError(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const buffer = e.target?.result as ArrayBuffer;
                const parsedStudents = parseSpartaExcel(buffer, file.name);

                if (!parsedStudents || parsedStudents.length === 0) {
                    setParseError(`В файле ${file.name} не найдено строк с учениками.`);
                    return;
                }

                addFileToQueue(file.name, file.size, parsedStudents);
            } catch (err: any) {
                console.error('Sparta Excel Parsing Error:', err);
                setParseError(`Ошибка чтения ${file.name}: ` + (err.message || 'Неподдерживаемый формат'));
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const files = Array.from(e.target.files || []);
        files.forEach(f => parseSelectedFile(f));
        e.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files || []);
        files.forEach(f => parseSelectedFile(f));
    };

    const triggerFilePicker = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleRemoveFileFromQueue = (fileId: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        if (activePreviewFileId === fileId) {
            setActivePreviewFileId(null);
        }
    };

    const handleCellChange = (fileId: string, rowId: string, field: keyof ImportRow, value: any) => {
        const finalValue = field === 'childName' ? toTitleCase(String(value || '')) : value;

        setUploadedFiles(prev => prev.map(f => {
            if (f.id !== fileId) return f;
            return {
                ...f,
                editableRows: f.editableRows.map(r => r.id === rowId ? { ...r, [field]: finalValue } : r)
            };
        }));
    };

    const handleToggleSelectRow = (fileId: string, rowId: string) => {
        setUploadedFiles(prev => prev.map(f => {
            if (f.id !== fileId) return f;
            return {
                ...f,
                editableRows: f.editableRows.map(r => r.id === rowId ? { ...r, selected: !r.selected } : r)
            };
        }));
    };

    const handleDeleteRow = (fileId: string, rowId: string) => {
        setUploadedFiles(prev => prev.map(f => {
            if (f.id !== fileId) return f;
            return {
                ...f,
                editableRows: f.editableRows.filter(r => r.id !== rowId)
            };
        }));
    };

    const handleAddBlankRow = (fileId: string) => {
        const newRow: ImportRow = {
            id: `row_manual_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            selected: true,
            childName: '',
            phone: '',
            age: '',
            groupName: filterGroup !== 'ALL' ? filterGroup : 'Без группы',
            coachName: ''
        };

        setUploadedFiles(prev => prev.map(f => {
            if (f.id !== fileId) return f;
            return {
                ...f,
                editableRows: [...f.editableRows, newRow]
            };
        }));

        setTimeout(() => {
            if (tableContainerRef.current) {
                tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
            }
        }, 50);
    };

    const handleCleanEmptyRows = (fileId: string) => {
        setUploadedFiles(prev => prev.map(f => {
            if (f.id !== fileId) return f;
            return {
                ...f,
                editableRows: f.editableRows.filter(r => r.childName.trim().length > 0)
            };
        }));
    };

    const handleToggleSelectAll = (fileId: string, currentFilteredRows: ImportRow[]) => {
        const allFilteredSelected = currentFilteredRows.every(r => r.selected);
        const targetIds = new Set(currentFilteredRows.map(r => r.id));

        setUploadedFiles(prev => prev.map(f => {
            if (f.id !== fileId) return f;
            return {
                ...f,
                editableRows: f.editableRows.map(r => targetIds.has(r.id) ? { ...r, selected: !allFilteredSelected } : r)
            };
        }));
    };

    const handleApplyBatchGroup = (fileId: string) => {
        const targetGroup = batchSelectGroup === '__NEW__' ? batchCustomGroup.trim() : batchSelectGroup.trim();
        if (!targetGroup) return;

        setUploadedFiles(prev => prev.map(f => {
            if (f.id !== fileId) return f;
            return {
                ...f,
                editableRows: f.editableRows.map(r => r.selected ? { ...r, groupName: targetGroup } : r)
            };
        }));
        setBatchSelectGroup('');
        setBatchCustomGroup('');
    };

    const handleConfirmImportAll = async () => {
        const totalToImport = allSelectedRows.length;
        const totalGroups = totalUniqueGroups.length;
        await onConfirmImport(allSelectedRows);
        setImportedSuccessCount(totalToImport);
        setImportedGroupsCount(totalGroups);
        setIsImportSuccess(true);
        try {
            localStorage.removeItem('sparta_excel_import_queue');
            localStorage.removeItem('pending_import_students');
            sessionStorage.removeItem('sparta_excel_import_queue');
        } catch (e) {}
    };

    const handleCloseModal = () => {
        setIsImportSuccess(false);
        setUploadedFiles([]);
        setActivePreviewFileId(null);
        try {
            localStorage.removeItem('sparta_excel_import_queue');
            localStorage.removeItem('pending_import_students');
            sessionStorage.removeItem('sparta_excel_import_queue');
        } catch (e) {}
        onClose();
    };

    if (!isOpen) return null;

    const allSelectedRows: ImportRow[] = uploadedFiles.flatMap(f => f.editableRows.filter(r => r.selected && r.childName.trim().length > 0));
    const totalUniqueGroups = Array.from(new Set(allSelectedRows.map(r => r.groupName.trim())));

    const activePreviewFile = uploadedFiles.find(f => f.id === activePreviewFileId);

    const previewFilteredRows = activePreviewFile ? activePreviewFile.editableRows.filter(row => {
        const q = searchQuery.toLowerCase().trim();
        const cleanQueryPhone = q.replace(/\D/g, '');

        const matchesName = !q || row.childName.toLowerCase().includes(q);
        const matchesPhone = !q || (cleanQueryPhone.length > 0 && row.phone.replace(/\D/g, '').includes(cleanQueryPhone));
        const matchesSearch = matchesName || matchesPhone;

        const matchesGroup = filterGroup === 'ALL' || row.groupName.trim() === filterGroup;

        return matchesSearch && matchesGroup;
    }) : [];

    const activeUniqueGroups = activePreviewFile
        ? Array.from(new Set(activePreviewFile.editableRows.map(r => r.groupName.trim())))
        : [];

    const groupOptionsList = Array.from(new Set([
        ...existingGroups.map(g => g.name),
        ...activeUniqueGroups,
        'Без группы'
    ])).filter(Boolean);

    const selectedCount = activePreviewFile ? activePreviewFile.editableRows.filter(r => r.selected).length : 0;

    const fullyValidRowsCount = activePreviewFile
        ? activePreviewFile.editableRows.filter(r => r.childName.trim().length > 0 && r.phone.trim().length > 0 && r.groupName !== 'Без группы').length
        : 0;

    const phoneCountsMap: Record<string, number> = {};
    const inFileDuplicateKeysMap: Record<string, number> = {};

    if (activePreviewFile) {
        activePreviewFile.editableRows.forEach(r => {
            const clean = r.phone.replace(/\D/g, '');
            if (clean.length >= 10) {
                phoneCountsMap[clean] = (phoneCountsMap[clean] || 0) + 1;
            }
            if (r.childName.trim()) {
                const dupKey = `${r.childName.toLowerCase().trim()}_${clean}`;
                inFileDuplicateKeysMap[dupKey] = (inFileDuplicateKeysMap[dupKey] || 0) + 1;
            }
        });
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={(e) => {
                if (e.target === e.currentTarget) handleCloseModal();
            }}
        >
            <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                multiple
                onChange={handleFileInputChange}
                onClick={e => e.stopPropagation()}
                className="hidden"
            />

            <div className="bg-[#141414] border border-white/10 rounded-3xl w-full max-w-5xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>

                {/* SUCCESS VIEW */}
                {isImportSuccess ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center my-auto animate-in zoom-in-95 duration-300">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-green-500/20 to-emerald-500/10 border-2 border-green-500/40 text-green-400 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                            <PartyPopper size={48} className="animate-pulse text-sparta-gold" />
                        </div>

                        <h3 className="text-2xl font-bold text-white font-russo mb-2 flex items-center gap-2">
                            Успешно импортировано {importedSuccessCount} учеников в {importedGroupsCount} {importedGroupsCount === 1 ? 'группу' : 'групп'}!
                        </h3>
                        <p className="text-white/60 text-sm max-w-md mb-8 leading-relaxed">
                            Все выбранные ученики зарегистрированы и привязаны к соответствующим группам в базе данных Спарта.
                        </p>

                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="bg-sparta-gold hover:bg-[#ffd700] text-black font-bold py-3.5 px-10 rounded-2xl transition-all shadow-xl shadow-sparta-gold/20 text-sm hover:scale-105 active:scale-95"
                        >
                            Готово
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white font-russo flex items-center gap-2">
                                    <Upload className="text-green-400" size={24} />
                                    Многофайловый импорт Excel / CSV
                                </h3>
                                <p className="text-white/40 text-xs mt-0.5">
                                    Загружено файлов: <span className="text-sparta-gold font-bold">{uploadedFiles.length}</span> | Учеников в очереди: <span className="text-white font-bold">{allSelectedRows.length}</span>
                                </p>
                            </div>
                            <button onClick={handleCloseModal} className="text-white/40 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Dropzone */}
                        {uploadedFiles.length === 0 && (
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`flex-1 flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                                    isDragging ? 'border-green-400 bg-green-500/10' : 'border-white/15 hover:border-sparta-gold/40 bg-white/[0.02]'
                                }`}
                                onClick={triggerFilePicker}
                            >
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-sparta-gold border border-white/10">
                                    <FileUp size={32} />
                                </div>
                                <h4 className="text-lg font-bold text-white mb-1">Перетащите файлы Excel (.xlsx, .xls) или CSV сюда</h4>
                                <p className="text-white/40 text-xs mb-6 text-center max-w-md">
                                    Автоматический разбор всех вкладок Excel (ФИО, Телефоны, Родители и Названия групп).
                                </p>
                                <button
                                    type="button"
                                    onClick={triggerFilePicker}
                                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-green-600/20"
                                >
                                    <FileText size={18} />
                                    Выбрать файлы на компьютере
                                </button>
                                {parseError && (
                                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                                        <AlertCircle size={16} />
                                        {parseError}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* File Queue View */}
                        {uploadedFiles.length > 0 && !activePreviewFile && (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Очередь файлов к импорту</h4>
                                    <button
                                        type="button"
                                        onClick={triggerFilePicker}
                                        className="bg-white/5 hover:bg-white/10 text-sparta-gold border border-sparta-gold/30 font-bold px-3.5 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5"
                                    >
                                        <Plus size={16} /> Добавить еще файл
                                    </button>
                                </div>

                                <div className="flex-1 overflow-auto space-y-3 pr-1 mb-4">
                                    {uploadedFiles.map(file => {
                                        const validCount = file.editableRows.filter(r => r.selected && r.childName.trim().length > 0).length;

                                        return (
                                            <div
                                                key={file.id}
                                                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-white/20 transition-all"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 shrink-0">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <h5 className="text-white text-sm font-bold truncate">{file.name}</h5>
                                                        <p className="text-white/40 text-xs">
                                                            Распознано учеников: <span className="text-white font-mono">{file.editableRows.length}</span> | Выбрано: <span className="text-sparta-gold font-bold font-mono">{validCount}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setActivePreviewFileId(file.id)}
                                                        className="px-3.5 py-2 bg-sparta-gold/10 hover:bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                                    >
                                                        <Eye size={14} /> Предпросмотр & Правка
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFileFromQueue(file.id)}
                                                        className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Table Preview View */}
                        {activePreviewFile && (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Top Action Bar */}
                                <div className="flex flex-wrap items-center gap-2.5 mb-3 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setActivePreviewFileId(null)}
                                        className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10 shrink-0"
                                    >
                                        <ArrowLeft size={14} /> Назад к файлам
                                    </button>

                                    <div className="relative flex-1 bg-[#0a0a0a] border border-sparta-gold/30 focus-within:border-sparta-gold rounded-xl px-3.5 py-1.5 flex items-center gap-2 shadow-md transition-all">
                                        <Search size={15} className="text-sparta-gold shrink-0" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="🔍 Поиск по ФИО или номеру телефона..."
                                            className="w-full bg-transparent text-xs text-white placeholder:text-white/40 focus:outline-none font-medium"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleAddBlankRow(activePreviewFile.id)}
                                        className="bg-sparta-gold/10 hover:bg-sparta-gold/20 text-sparta-gold border border-sparta-gold/30 font-bold px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                                    >
                                        <UserPlus size={14} /> + Добавить ученика
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleCleanEmptyRows(activePreviewFile.id)}
                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                                        title="Удалить все строки без ФИО"
                                    >
                                        <Eraser size={14} /> 🧹 Очистить пустые
                                    </button>

                                    <select
                                        value={filterGroup}
                                        onChange={e => setFilterGroup(e.target.value)}
                                        className="bg-[#0a0a0a] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:border-sparta-gold focus:outline-none shrink-0"
                                    >
                                        <option value="ALL">Все группы ({activePreviewFile.editableRows.length})</option>
                                        {activeUniqueGroups.map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Conditional Batch Action Bar */}
                                {selectedCount > 0 && (
                                    <div className="flex flex-wrap items-center gap-3 bg-sparta-gold/10 border border-sparta-gold/30 p-2.5 rounded-xl mb-3 shrink-0">
                                        <span className="text-xs text-sparta-gold font-bold shrink-0">
                                            Выбрано: {selectedCount}
                                        </span>
                                        <div className="h-4 w-px bg-sparta-gold/30 shrink-0" />

                                        <select
                                            value={batchSelectGroup}
                                            onChange={e => setBatchSelectGroup(e.target.value)}
                                            className="bg-[#0a0a0a] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-sparta-gold focus:outline-none max-w-xs truncate"
                                        >
                                            <option value="">-- Выберите целевую группу --</option>
                                            {groupOptionsList.map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                            <option value="__NEW__">+ Ввести вручную (Новая группа)...</option>
                                        </select>

                                        {batchSelectGroup === '__NEW__' && (
                                            <input
                                                type="text"
                                                value={batchCustomGroup}
                                                onChange={e => setBatchCustomGroup(e.target.value)}
                                                placeholder="Введите название новой группы..."
                                                className="bg-[#0a0a0a] border border-sparta-gold/40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                                            />
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleApplyBatchGroup(activePreviewFile.id)}
                                            className="px-3.5 py-1.5 bg-sparta-gold text-black rounded-lg text-xs font-bold hover:bg-[#ffd700] transition-colors shrink-0"
                                        >
                                            Назначить выделенным ({selectedCount})
                                        </button>
                                    </div>
                                )}

                                {/* Table */}
                                <div ref={tableContainerRef} className="flex-1 overflow-auto border border-white/10 rounded-2xl bg-[#0a0a0a] mb-2 flex flex-col justify-between">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-[#141414] text-white/40 sticky top-0 uppercase font-bold text-[10px] z-10 border-b border-white/10">
                                            <tr>
                                                <th className="p-2.5 w-10 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={previewFilteredRows.length > 0 && previewFilteredRows.every(r => r.selected)}
                                                        onChange={() => handleToggleSelectAll(activePreviewFile.id, previewFilteredRows)}
                                                        className="rounded border-white/20 text-sparta-gold focus:ring-0 cursor-pointer"
                                                        title="Выбрать все"
                                                    />
                                                </th>
                                                <th className="p-2.5 w-10">#</th>
                                                <th className="p-2.5">ФИО Ученика</th>
                                                <th className="p-2.5">Телефон</th>
                                                <th className="p-2.5">Родитель / Заметка</th>
                                                <th className="p-2.5 w-72">Группа</th>
                                                <th className="p-2.5 w-10 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-white">
                                            {previewFilteredRows.map((row, idx) => {
                                                const matchedGroup = existingGroups.find(g => g.name.toLowerCase() === row.groupName.trim().toLowerCase());
                                                const cleanPhoneDigits = row.phone.replace(/\D/g, '');
                                                const isDuplicatePhone = existingPhones.some(p => p.replace(/\D/g, '') === cleanPhoneDigits && cleanPhoneDigits.length >= 10);

                                                const dupKey = `${row.childName.toLowerCase().trim()}_${cleanPhoneDigits}`;
                                                const isInFileDuplicate = (inFileDuplicateKeysMap[dupKey] || 0) > 1;

                                                const familyCount = cleanPhoneDigits.length >= 10 ? (phoneCountsMap[cleanPhoneDigits] || 0) : 0;
                                                const isMissingName = !row.childName.trim();
                                                const isMissingPhone = !row.phone.trim();
                                                const isUnassignedGroup = row.groupName === 'Без группы';

                                                return (
                                                    <tr key={row.id} className={`group transition-colors ${row.selected ? 'hover:bg-white/5' : 'opacity-40 bg-white/[0.02]'}`}>
                                                        <td className="p-2.5 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={row.selected}
                                                                onChange={() => handleToggleSelectRow(activePreviewFile.id, row.id)}
                                                                className="rounded border-white/20 text-sparta-gold focus:ring-0 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="p-2.5 font-mono text-white/30">{idx + 1}</td>

                                                        {/* Child Name */}
                                                        <td className="p-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={row.childName}
                                                                    onChange={e => handleCellChange(activePreviewFile.id, row.id, 'childName', e.target.value)}
                                                                    placeholder="Введите ФИО..."
                                                                    className={`w-full bg-transparent hover:bg-white/5 focus:bg-[#1a1a1a] border border-transparent focus:border-sparta-gold/50 rounded-lg px-2 py-1 text-xs text-white font-bold transition-all focus:outline-none ${
                                                                        isMissingName ? 'text-red-400 placeholder:text-red-400/50' : ''
                                                                    }`}
                                                                />
                                                                {isMissingName && (
                                                                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                                                                        ❌ Нет ФИО
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Phone Number with Family Indicator */}
                                                        <td className="p-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={row.phone}
                                                                    onChange={e => handleCellChange(activePreviewFile.id, row.id, 'phone', e.target.value)}
                                                                    placeholder="— Не указан —"
                                                                    className={`w-full bg-transparent hover:bg-white/5 focus:bg-[#1a1a1a] border border-transparent focus:border-sparta-gold/50 rounded-lg px-2 py-1 text-xs text-white/80 font-mono transition-all focus:outline-none ${
                                                                        isMissingPhone ? 'text-amber-400 placeholder:text-amber-400/60' : ''
                                                                    }`}
                                                                />
                                                                {familyCount > 1 && (
                                                                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 flex items-center gap-1" title={`Семья: ${familyCount} учеников с одинаковым номером`}>
                                                                        <Users size={10} /> Семья ({familyCount})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Parent / Note */}
                                                        <td className="p-1.5">
                                                            <input
                                                                type="text"
                                                                value={row.parentName || ''}
                                                                onChange={e => handleCellChange(activePreviewFile.id, row.id, 'parentName', e.target.value)}
                                                                placeholder="Родитель / Заметка..."
                                                                className="w-full bg-transparent hover:bg-white/5 focus:bg-[#1a1a1a] border border-transparent focus:border-sparta-gold/50 rounded-lg px-2 py-1 text-xs text-white/90 font-medium transition-all focus:outline-none placeholder:text-white/20"
                                                            />
                                                        </td>

                                                        {/* Group Selector & Merged Status Badge */}
                                                        <td className="p-1.5">
                                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                                <select
                                                                    value={groupOptionsList.includes(row.groupName) ? row.groupName : '__CUSTOM__'}
                                                                    title={row.groupName}
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        if (val !== '__CUSTOM__') {
                                                                            handleCellChange(activePreviewFile.id, row.id, 'groupName', val);
                                                                        }
                                                                    }}
                                                                    className="bg-[#0a0a0a] text-white border border-white/10 rounded-xl px-2 py-1 focus:border-sparta-gold focus:outline-none max-w-[180px] truncate text-xs"
                                                                >
                                                                    {groupOptionsList.map(g => (
                                                                        <option key={g} value={g}>{g}</option>
                                                                    ))}
                                                                    {!groupOptionsList.includes(row.groupName) && (
                                                                        <option value="__CUSTOM__">{row.groupName}</option>
                                                                    )}
                                                                </select>

                                                                {isInFileDuplicate ? (
                                                                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0" title="Дубликат в файле импорта">
                                                                        ⚠️ Дубликат в файле
                                                                    </span>
                                                                ) : isDuplicatePhone ? (
                                                                    <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0" title="Телефон уже есть в базе">
                                                                        ⚠️ В базе
                                                                    </span>
                                                                ) : isUnassignedGroup ? (
                                                                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                                                                        ⚠️ Без группы
                                                                    </span>
                                                                ) : matchedGroup ? (
                                                                    <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                                                                        ✓ Есть
                                                                    </span>
                                                                ) : (
                                                                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                                                                        + Новая
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Hover-only Delete Button */}
                                                        <td className="p-2.5 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteRow(activePreviewFile.id, row.id)}
                                                                className="text-white/30 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Удалить строку"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {/* Full-width Dashed Add Row Footer */}
                                            <tr
                                                onClick={() => handleAddBlankRow(activePreviewFile.id)}
                                                className="border-t border-dashed border-white/10 hover:border-sparta-gold/40 hover:bg-sparta-gold/5 cursor-pointer transition-all"
                                            >
                                                <td colSpan={7} className="p-3 text-center text-xs font-bold text-sparta-gold/80 hover:text-sparta-gold">
                                                    <span className="flex items-center justify-center gap-1.5">
                                                        <Plus size={15} /> + Добавить новую строку вручную
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        {uploadedFiles.length > 0 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 shrink-0 border-t border-white/10">
                                <div className="text-xs text-white/60 flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <Check className="text-green-400" size={16} />
                                        Итого к импорту: <span className="text-white font-bold">{allSelectedRows.length}</span> учеников из <span className="text-green-400 font-bold">{uploadedFiles.length}</span> файлов в <span className="text-sparta-gold font-bold">{totalUniqueGroups.length}</span> групп
                                    </div>
                                    {activePreviewFile && (
                                        <span className="text-white/30 font-mono text-[11px] border-l border-white/10 pl-3">
                                            ({fullyValidRowsCount} из {activePreviewFile.editableRows.length} полностью заполнены)
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl text-xs font-bold transition-all"
                                    >
                                        Отмена
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleConfirmImportAll}
                                        disabled={processing || allSelectedRows.length === 0}
                                        className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-green-600/20"
                                    >
                                        {processing ? <RefreshCw className="animate-spin" size={14} /> : <Upload size={14} />}
                                        Импортировать все ({allSelectedRows.length} учеников)
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
