// client/src/components/TimeTable.js
import React, { useState, useEffect } from 'react';
import {
    Paper,
    Typography,
    Box,
    Card,
    CardContent,
    CardActions,
    Button,
    IconButton,
    Grid,
    Chip,
    alpha,
    useTheme,
    Fab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Schedule,
    School,
    MoreVert,
    CalendarToday
} from '@mui/icons-material';
import TimeTableForm from "./TimeTableForm";

export default function TimeTable() {
    const [timeTables, setTimeTables] = useState([]);
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [selectedTimeTable, setSelectedTimeTable] = useState(null);
    const theme = useTheme();

    // Données d'exemple - à remplacer par un appel API
    useEffect(() => {
        // Simulation de données
        setTimeTables([
            {
                id: '1',
                title: '2024-2025',
                description: 'Année scolaire 2024-2025',
                createdAt: new Date('2024-09-01'),
                classes: ['6ème A', '6ème B', '5ème A'],
                totalHours: 18,
                schedule: {
                    lundi: [
                        { time: '08:00-09:00', class: '6ème A', subject: 'Mathématiques' },
                        { time: '09:00-10:00', class: '6ème B', subject: 'Mathématiques' }
                    ],
                    mardi: [
                        { time: '14:00-15:00', class: '5ème A', subject: 'Physique' }
                    ]
                }
            }
        ]);
    }, []);

    const handleTimeTableForm = (newTimeTable) => {
        const timeTable = {
            id: Date.now().toString(),
            ...newTimeTable,
            createdAt: new Date()
        };
        setTimeTables([...timeTables, timeTable]);
        setOpenCreateDialog(false);
    };

    const handleDeleteTimeTable = (id) => {
        setTimeTables(timeTables.filter(tt => tt.id !== id));
    };

    const TimeTableCard = ({ timeTable }) => (
        <Card
            sx={{
                height: '100%',
                borderRadius: 3,
                transition: 'all 0.3s ease',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                }
            }}
        >
            <CardContent sx={{ pb: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Schedule color="primary" />
                        <Typography variant="h6" fontWeight="bold">
                            {timeTable.title}
                        </Typography>
                    </Box>
                    <IconButton size="small">
                        <MoreVert />
                    </IconButton>
                </Box>

                <Typography variant="body2" color="textSecondary" mb={2}>
                    {timeTable.description}
                </Typography>

                <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                        Classes ({timeTable.classes.length})
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                        {timeTable.classes.slice(0, 3).map((classe, index) => (
                            <Chip
                                key={index}
                                label={classe}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        ))}
                        {timeTable.classes.length > 3 && (
                            <Chip
                                label={`+${timeTable.classes.length - 3}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        )}
                    </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Chip
                        icon={<CalendarToday />}
                        label={`${timeTable.totalHours}h/semaine`}
                        color="secondary"
                        size="small"
                    />
                    <Typography variant="caption" color="textSecondary">
                        Créé le {timeTable.createdAt.toLocaleDateString('fr-FR')}
                    </Typography>
                </Box>
            </CardContent>

            <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => setSelectedTimeTable(timeTable)}
                >
                    Modifier
                </Button>
                <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => handleDeleteTimeTable(timeTable.id)}
                >
                    Supprimer
                </Button>
            </CardActions>
        </Card>
    );

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box
                sx={{
                    mb: 4,
                    p: 4,
                    borderRadius: 4,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Mes emplois du temps
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9 }}>
                        Gérez vos emplois du temps par année scolaire
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setOpenCreateDialog(true)}
                    sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.3)',
                        }
                    }}
                >
                    Ajouter
                </Button>
            </Box>

            {/* Liste des emplois du temps */}
            {timeTables.length === 0 ? (
                <Paper
                    sx={{
                        p: 6,
                        textAlign: 'center',
                        borderRadius: 3,
                        border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                        bgcolor: alpha(theme.palette.primary.main, 0.02)
                    }}
                >
                    <School sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                        Aucun emploi du temps
                    </Typography>
                    <Typography variant="body2" color="textSecondary" mb={3}>
                        Créez votre premier emploi du temps pour commencer
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setOpenCreateDialog(true)}
                        size="large"
                    >
                        Créer un emploi du temps
                    </Button>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {timeTables.map((timeTable) => (
                        <Grid item xs={12} sm={6} md={4} key={timeTable.id}>
                            <TimeTableCard timeTable={timeTable} />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Bouton flottant pour ajouter */}
            {timeTables.length > 0 && (
                <Fab
                    color="primary"
                    aria-label="ajouter"
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`
                    }}
                    onClick={() => setOpenCreateDialog(true)}
                >
                    <Add />
                </Fab>
            )}

            {/* Dialog de création */}
            <TimeTableForm
                open={openCreateDialog}
                onClose={() => setOpenCreateDialog(false)}
                onSubmit={handleTimeTableForm}
            />
        </Box>
    );
}
