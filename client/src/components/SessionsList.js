// client/src/components/SessionsList.js
import React, { useState, useEffect } from 'react';
import {
    Container,
    Grid,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Typography,
    Box,
    Pagination
} from '@mui/material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import SessionCard from './SessionCard';
import { sessionService } from '../services/api';

export default function SessionsList() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        className: '',
        subject: '',
        page: 1
    });

    const loadSessions = async () => {
        try {
            setLoading(true);
            const response = await sessionService.getSessions(filters);
            setSessions(response.data.sessions);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Erreur chargement sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
    }, [filters]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value,
            page: 1 // Reset page when filtering
        }));
    };

    const handlePageChange = (event, page) => {
        setFilters(prev => ({ ...prev, page }));
    };

    const handleUpdateSession = async (updatedSession) => {
        try {
            await sessionService.updateSession(updatedSession._id, updatedSession);
            // Recharger la liste
            loadSessions();
        } catch (error) {
            throw error;
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>
                Journal de classe
            </Typography>

            {/* Filtres */}
            <Box sx={{ mb: 4 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            fullWidth
                            label="Date début"
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            fullWidth
                            label="Date fin"
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            fullWidth
                            label="Classe"
                            value={filters.className}
                            onChange={(e) => handleFilterChange('className', e.target.value)}
                            placeholder="ex: 3TTI"
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            fullWidth
                            label="Matière"
                            value={filters.subject}
                            onChange={(e) => handleFilterChange('subject', e.target.value)}
                            placeholder="ex: Informatique"
                        />
                    </Grid>
                </Grid>
            </Box>

            {/* Liste des sessions */}
            {loading ? (
                <Typography>Chargement...</Typography>
            ) : (
                <>
                    <Typography variant="h6" gutterBottom>
                        {pagination.totalItems} session(s) trouvée(s)
                    </Typography>

                    {sessions.map((session) => (
                        <SessionCard
                            key={session._id}
                            session={session}
                            onUpdate={handleUpdateSession}
                        />
                    ))}

                    {pagination.totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <Pagination
                                count={pagination.totalPages}
                                page={pagination.currentPage}
                                onChange={handlePageChange}
                                color="primary"
                            />
                        </Box>
                    )}
                </>
            )}
        </Container>
    );
}
