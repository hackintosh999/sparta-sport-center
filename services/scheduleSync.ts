export const triggerScheduleSync = async (data?: any) => {
    console.log('Triggering schedule sync...', data);
    return { success: true };
};

export const triggerReverseSync = async (data?: any) => {
    console.log('Triggering reverse schedule sync...', data);
    return { success: true };
};
