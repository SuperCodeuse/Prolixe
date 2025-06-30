// client/src/components/SessionCard.js
import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    TextField,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function SessionCard({ session, onUpdate }) {
    const [editing, setEditing] = useState(false);
    const [editedSession, setEditedSession] = useState(session);

    const handleSave = async () => {
        try {
            await onUpdate(editedSession);
            setEditing(false);
        } catch (error) {
            alert('Erreur lors de la sauvegarde');
        }
    };

    const handleCancel = () => {
        setEditedSession(session);
        setEditing(false);
    };

    const getSubjectDisplay = () => {
        if (typeof session.subjects === 'string') {
            return session.subjects;
        } else if (typeof session.subjects === 'object') {
            return Object.values(session.subjects).join(', ');
        }
        return 'Matière non spécifiée';
    };

    const getDurationDisplay = () => {
        if (typeof session.duration === 'string') {
            return session.duration;
        } else if (typeof session.duration === 'object') {
            return Object.values(session.duration).join(' / ');
        }
        return '';
    };

    return (
        <Card sx={{ mb: 2 }}>
            <CardContent>
                {/* En-tête */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                        <Typography variant="h6" component="h2">
                            {getSubjectDisplay()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {format(new Date(session.date), 'EEEE d MMMM yyyy', { locale: fr })}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                            <Chip label={session.classes} size="small" sx={{ mr: 1 }} />
                            {getDurationDisplay() && (
                                <Chip label={getDurationDisplay()} size="small" variant="outlined" />
                            )}
                        </Box>
                    </Box>

                    <Button
                        startIcon={editing ? <SaveIcon /> : <EditIcon />}
                        onClick={editing ? handleSave : () => setEditing(true)}
                        variant={editing ? "contained" : "outlined"}
                        size="small"
                    >
                        {editing ? 'Sauver' : 'Éditer'}
                    </Button>
                </Box>

                {/* Activités du cours (lecture seule) */}
                {session.activities && session.activities.length > 0 && (
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2">
                                Activités réalisées ({session.activities.length})
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {session.activities.map((activity, index) => (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2" color="primary" component="span">
                                        {activity.time}
                                    </Typography>
                                    <Typography variant="body2" component="div">
                                        {activity.description}
                                    </Typography>
                                    {index < session.activities.length - 1 && <Divider sx={{ my: 1 }} />}
                                </Box>
                            ))}
                        </AccordionDetails>
                    </Accordion>
                )}

                {/* Remédiation si présente */}
                {session.remediation && session.remediation.length > 0 && (
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2">
                                Remédiation
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {session.remediation.map((rem, index) => (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2" color="primary" component="span">
                                        {rem.time}
                                    </Typography>
                                    <Typography variant="body2" component="div">
                                        {rem.description}
                                    </Typography>
                                </Box>
                            ))}
                        </AccordionDetails>
                    </Accordion>
                )}

                {/* Événements si présents */}
                {session.events && session.events.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Événements spéciaux:
                        </Typography>
                        {session.events.map((event, index) => (
                            <Chip
                                key={index}
                                label={event}
                                size="small"
                                color="secondary"
                                variant="outlined"
                                sx={{ mr: 1, mb: 1 }}
                            />
                        ))}
                    </Box>
                )}

                {/* Champs éditables pour le journal */}
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle2">
                            Devoirs donnés
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="Quels devoirs avez-vous donnés ?"
                            value={editedSession.homework || ''}
                            onChange={(e) => setEditedSession({
                                ...editedSession,
                                homework: e.target.value
                            })}
                            disabled={!editing}
                            variant={editing ? "outlined" : "filled"}
                        />
                    </AccordionDetails>
                </Accordion>

                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle2">
                            Préparation prochain cours
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="Que devez-vous préparer ?"
                            value={editedSession.preparation || ''}
                            onChange={(e) => setEditedSession({
                                ...editedSession,
                                preparation: e.target.value
                            })}
                            disabled={!editing}
                            variant={editing ? "outlined" : "filled"}
                        />
                    </AccordionDetails>
                </Accordion>

                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle2">
                            Interrogation prévue
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                fullWidth
                                label="Date de l'interrogation"
                                type="date"
                                value={editedSession.quiz?.date || ''}
                                onChange={(e) => setEditedSession({
                                    ...editedSession,
                                    quiz: { ...editedSession.quiz, date: e.target.value }
                                })}
                                disabled={!editing}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                fullWidth
                                label="Sujet"
                                value={editedSession.quiz?.topic || ''}
                                onChange={(e) => setEditedSession({
                                    ...editedSession,
                                    quiz: { ...editedSession.quiz, topic: e.target.value }
                                })}
                                disabled={!editing}
                            />
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Description"
                                value={editedSession.quiz?.description || ''}
                                onChange={(e) => setEditedSession({
                                    ...editedSession,
                                    quiz: { ...editedSession.quiz, description: e.target.value }
                                })}
                                disabled={!editing}
                            />
                        </Box>
                    </AccordionDetails>
                </Accordion>

                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle2">
                            Notes personnelles
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="Ajoutez vos notes sur ce cours..."
                            value={editedSession.notes || ''}
                            onChange={(e) => setEditedSession({
                                ...editedSession,
                                notes: e.target.value
                            })}
                            disabled={!editing}
                            variant={editing ? "outlined" : "filled"}
                        />
                    </AccordionDetails>
                </Accordion>

                {/* Boutons d'action si en mode édition */}
                {editing && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        <Button onClick={handleCancel} variant="outlined">
                            Annuler
                        </Button>
                        <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />}>
                            Sauvegarder
                        </Button>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}

