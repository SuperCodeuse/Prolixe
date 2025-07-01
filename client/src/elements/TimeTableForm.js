// client/src/components/TimeTableForm.js
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Grid,
    Paper,
    Chip,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Card,
    CardContent,
    alpha,
    useTheme
} from '@mui/material';
import {
    Add,
    Delete,
    Schedule,
    School,
    Close
} from '@mui/icons-material';

const DAYS = [
    { key: 'lundi', label: 'Lundi' },
    { key: 'mardi', label: 'Mardi' },
    { key: 'mercredi', label: 'Mercredi' },
    { key: 'jeudi', label: 'Jeudi' },
    { key: 'vendredi', label: 'Vendredi' },
    { key: 'samedi', label: 'Samedi' }
];

const TIME_SLOTS = [
    '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
    '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00'
];

const CLASSES = [
    '6ème A', '6ème B', '6ème C',
    '5ème A', '5ème B', '5ème C',
    '4ème A', '4ème B', '4ème C',
    '3ème A', '3ème B', '3ème C'
];

const SUBJECTS = [
    'Mathématiques', 'Français', 'Histoire-Géographie',
    'Sciences', 'Physique-Chimie', 'SVT', 'Technologie',
    'Arts Plastiques', 'Musique', 'EPS', 'Anglais', 'Espagnol'
];

export default function TimeTableForm({ open, onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        schedule: {}
    });
    const theme = useTheme();

    const handleSubmit = () => {
        if (!formData.title.trim()) return;

        const classes = [...new Set(
            Object.values(formData.schedule)
                .flat()
                .map(slot => slot.class)
        )];

        const totalHours = Object.values(formData.schedule)
            .flat()
            .length;

        onSubmit({
            ...formData,
            classes,
            totalHours
        });

        // Reset form
        setFormData({
            title: '',
            description: '',
            schedule: {}
        });
    };

    const addTimeSlot = (day) => {
        const newSlot = {
            time: TIME_SLOTS[0],
            class: CLASSES[0],
            subject: SUBJECTS[0]
        };

        setFormData(prev => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [day]: [...(prev.schedule[day] || []), newSlot]
            }
        }));
    };

    const removeTimeSlot = (day, index) => {
        setFormData(prev => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [day]: prev.schedule[day].filter((_, i) => i !== index)
            }
        }));
    };

    const updateTimeSlot = (day, index, field, value) => {
        setFormData(prev => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [day]: prev.schedule[day].map((slot, i) =>
                    i === index ? { ...slot, [field]: value } : slot
                )
            }
        }));
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3, minHeight: '70vh' }
            }}
        >
            <DialogTitle sx={{
                pb: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Schedule />
                    <Typography variant="h6" fontWeight="bold">
                        Créer un emploi du temps
                    </Typography>
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                <Grid container spacing={3}>
                    {/* Informations générales */}
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3, borderRadius: 3, height: 'fit-content' }}>
                            <Typography variant="h6" gutterBottom>
                                Informations générales
                            </Typography>

                            <TextField
                                fullWidth
                                label="Titre"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                margin="normal"
                                required
                            />

                            <TextField
                                fullWidth
                                label="Description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                margin="normal"
                                multiline
                                rows={3}
                            />

                            {/* Résumé */}
                            <Box mt={3}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Résumé
                                </Typography>
                                <Box display="flex" gap={1} mb={1}>
                                    <Chip
                                        icon={<School />}
                                        label={`${[...new Set(
                                            Object.values(formData.schedule)
                                                .flat()
                                                .map(slot => slot.class)
                                        )].length} classes`}
                                        size="small"
                                        color="primary"
                                    />
                                    <Chip
                                        icon={<Schedule />}
                                        label={`${Object.values(formData.schedule)
                                            .flat()
                                            .length}h/semaine`}
                                        size="small"
                                        color="secondary"
                                    />
                                </Box>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Semainier */}
                    <Grid item xs={12} md={8}>
                        <Paper sx={{ p: 3, borderRadius: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Planning hebdomadaire
                            </Typography>

                            <Grid container spacing={2}>
                                {DAYS.map((day) => (
                                    <Grid item xs={12} sm={6} key={day.key}>
                                        <Card
                                            sx={{
                                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                borderRadius: 2
                                            }}
                                        >
                                            <CardContent sx={{ p: 2 }}>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                                    <Typography variant="subtitle1" fontWeight="medium">
                                                        {day.label}
                                                    </Typography>
                                                    <Button
                                                        size="small"
                                                        startIcon={<Add />}
                                                        onClick={() => addTimeSlot(day.key)}
                                                    >
                                                        Ajouter
                                                    </Button>
                                                </Box>

                                                {formData.schedule[day.key]?.map((slot, index) => (
                                                    <Box key={index} sx={{ mb: 2, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1 }}>
                                                        <Grid container spacing={1}>
                                                            <Grid item xs={12}>
                                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                                    <Typography variant="caption" color="primary">
                                                                        Cours {index + 1}
                                                                    </Typography>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => removeTimeSlot(day.key, index)}
                                                                    >
                                                                        <Delete fontSize="small" />
                                                                    </IconButton>
                                                                </Box>
                                                            </Grid>

                                                            <Grid item xs={12}>
                                                                <FormControl size="small" fullWidth>
                                                                    <InputLabel>Horaire</InputLabel>
                                                                    <Select
                                                                        value={slot.time}
                                                                        onChange={(e) => updateTimeSlot(day.key, index, 'time', e.target.value)}
                                                                    >
                                                                        {TIME_SLOTS.map(time => (
                                                                            <MenuItem key={time} value={time}>{time}</MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </FormControl>
                                                            </Grid>

                                                            <Grid item xs={12}>
                                                                <FormControl size="small" fullWidth>
                                                                    <InputLabel>Classe</InputLabel>
                                                                    <Select
                                                                        value={slot.class}
                                                                        onChange={(e) => updateTimeSlot(day.key, index, 'class', e.target.value)}
                                                                    >
                                                                        {CLASSES.map(classe => (
                                                                            <MenuItem key={classe} value={classe}>{classe}</MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </FormControl>
                                                            </Grid>

                                                            <Grid item xs={12}>
                                                                <FormControl size="small" fullWidth>
                                                                    <InputLabel>Matière</InputLabel>
                                                                    <Select
                                                                        value={slot.subject}
                                                                        onChange={(e) => updateTimeSlot(day.key, index, 'subject', e.target.value)}
                                                                    >
                                                                        {SUBJECTS.map(subject => (
                                                                            <MenuItem key={subject} value={subject}>{subject}</MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </FormControl>
                                                            </Grid>
                                                        </Grid>
                                                    </Box>
                                                ))}

                                                {(!formData.schedule[day.key] || formData.schedule[day.key].length === 0) && (
                                                    <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', fontStyle: 'italic' }}>
                                                        Aucun cours programmé
                                                    </Typography>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose}>
                    Annuler
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!formData.title.trim()}
                >
                    Créer l'emploi du temps
                </Button>
            </DialogActions>
        </Dialog>
    );
}
