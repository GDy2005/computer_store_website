import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  LinearProgress,
  Pagination,
  Paper,
  Rating,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import {Link} from 'react-router-dom';

import {useAuth} from '../auth/AuthContext.jsx';
import {
  createComment,
  feedbackErrorMessage,
  fetchComments,
  fetchRatingSummary,
  updateCommentReaction,
  updateRating
} from './feedbackApi.js';
import {useProductRealtime} from './useProductRealtime.js';
import {useLanguage} from '../i18n/LanguageContext.jsx';
import UiIcon from '../../components/UiIcon.jsx';

const emptyComments = {
  items: [],
  meta: {page: 1, limit: 10, totalItems: 0, totalPages: 1}
};

const emptyRating = {
  averageRating: 0,
  ratingCount: 0,
  myRating: null,
  distribution: {}
};

function commentId(comment) {
  return comment._id || comment.commentId;
}

export default function ProductFeedback({productId, onRatingChange}) {
  const {user} = useAuth();
  const {locale, t} = useLanguage();
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }), [locale]);
  const [page, setPage] = useState(1);
  const [comments, setComments] = useState(emptyComments);
  const [rating, setRating] = useState(emptyRating);
  const [stars, setStars] = useState(0);
  const [form, setForm] = useState({guestName: '', guestEmail: '', content: ''});
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [reactingId, setReactingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refreshComments = useCallback(async (signal) => {
    const result = await fetchComments(productId, page, {signal});
    setComments(result);
    return result;
  }, [productId, page]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    Promise.all([
      refreshComments(controller.signal),
      fetchRatingSummary(productId, {signal: controller.signal})
    ])
      .then(([commentResult, ratingResult]) => {
        setComments(commentResult);
        setRating(ratingResult);
        setStars(ratingResult.myRating || 0);
        onRatingChange?.(ratingResult);
      })
      .catch(requestError => {
        const text = feedbackErrorMessage(
          requestError,
          t('feedback.loadError')
        );
        if (text) setError(text);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [productId, page, user?._id, t, refreshComments]);

  useProductRealtime(productId, {
    onComment(event) {
      if (!event?.commentId) return;
      refreshComments().catch(() => {});
    },
    onRating(event) {
      setRating(current => ({
        ...current,
        averageRating: event.averageRating,
        ratingCount: event.ratingCount
      }));
      onRatingChange?.(event);
      fetchRatingSummary(productId)
        .then(latest => {
          setRating(latest);
          setStars(latest.myRating || 0);
          onRatingChange?.(latest);
        })
        .catch(() => {});
    }
  });

  function change(field) {
    return event => setForm(current => ({
      ...current,
      [field]: event.target.value
    }));
  }

  async function submitComment(event) {
    event.preventDefault();
    try {
      setSubmittingComment(true);
      setError('');
      setMessage('');
      const created = await createComment(
        productId,
        user
          ? {content: form.content}
          : {
              guestName: form.guestName,
              guestEmail: form.guestEmail,
              content: form.content
            }
      );
      setForm(current => ({...current, content: ''}));
      setMessage(t('feedback.commentSent'));
      if (page !== 1) {
        setPage(1);
      } else {
        setComments(current => {
          if (current.items.some(item => commentId(item) === created._id)) {
            return current;
          }
          const totalItems = current.meta.totalItems + 1;
          return {
            items: [created, ...current.items].slice(0, current.meta.limit),
            meta: {
              ...current.meta,
              totalItems,
              totalPages: Math.max(
                1,
                Math.ceil(totalItems / current.meta.limit)
              )
            }
          };
        });
      }
    } catch (requestError) {
      setError(feedbackErrorMessage(requestError, t('feedback.commentError')));
    } finally {
      setSubmittingComment(false);
    }
  }

  async function submitRating() {
    if (!stars) return;
    try {
      setSubmittingRating(true);
      setError('');
      setMessage('');
      const result = await updateRating(productId, stars);
      setRating(current => ({...current, ...result, myRating: stars}));
      onRatingChange?.(result);
      setMessage(t('feedback.ratingSaved'));
    } catch (requestError) {
      setError(feedbackErrorMessage(requestError, t('feedback.ratingError')));
    } finally {
      setSubmittingRating(false);
    }
  }

  function openReply(comment) {
    if (!user) {
      setError(t('feedback.signInToInteract'));
      return;
    }

    setError('');
    setReplyContent('');
    setReplyTarget(current => current === commentId(comment) ? null : commentId(comment));
  }

  async function submitReply(event, parentCommentId) {
    event.preventDefault();
    try {
      setSubmittingReply(true);
      setError('');
      await createComment(productId, {
        content: replyContent,
        parentCommentId
      });
      setReplyContent('');
      setReplyTarget(null);
      setMessage(t('feedback.replySent'));
      await refreshComments();
    } catch (requestError) {
      setError(feedbackErrorMessage(requestError, t('feedback.replyError')));
    } finally {
      setSubmittingReply(false);
    }
  }

  async function reactToComment(comment, reaction) {
    if (!user) {
      setError(t('feedback.signInToInteract'));
      return;
    }

    const id = commentId(comment);
    const nextReaction = comment.myReaction === reaction ? 'NONE' : reaction;

    try {
      setReactingId(id);
      setError('');
      await updateCommentReaction(productId, id, nextReaction);
      await refreshComments();
    } catch (requestError) {
      setError(feedbackErrorMessage(requestError, t('feedback.reactionError')));
    } finally {
      setReactingId(null);
    }
  }

  function renderComment(comment, {reply = false} = {}) {
    const id = commentId(comment);

    return (
      <Paper
        key={id}
        variant="outlined"
        sx={{
          p: reply ? 2 : 2.5,
          ml: reply ? {xs: 2, sm: 5} : 0,
          bgcolor: reply ? 'rgba(0,0,0,.018)' : 'background.paper',
          borderLeft: reply ? '3px solid' : undefined,
          borderLeftColor: reply ? 'secondary.main' : undefined
        }}
      >
        <Stack spacing={1.25}>
          <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" gap={0.5}>
            <Typography fontWeight={800}>{comment.displayName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {dateFormatter.format(new Date(comment.createdAt))}
            </Typography>
          </Stack>
          <Typography sx={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{comment.content}</Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Button
              size="small"
              color={comment.myReaction === 'LIKE' ? 'secondary' : 'inherit'}
              disabled={reactingId === id}
              startIcon={<UiIcon name="thumbUp" sx={{fontSize: 17}}/>}
              onClick={() => reactToComment(comment, 'LIKE')}
            >
              {comment.likeCount || 0}
            </Button>
            <Button
              size="small"
              color={comment.myReaction === 'DISLIKE' ? 'error' : 'inherit'}
              disabled={reactingId === id}
              startIcon={<UiIcon name="thumbDown" sx={{fontSize: 17}}/>}
              onClick={() => reactToComment(comment, 'DISLIKE')}
            >
              {comment.dislikeCount || 0}
            </Button>
            {!reply && (
              <Button
                size="small"
                color="inherit"
                startIcon={<UiIcon name="reply" sx={{fontSize: 17}}/>}
                onClick={() => openReply(comment)}
              >
                {t('feedback.reply')}
              </Button>
            )}
          </Stack>
          {!reply && replyTarget === id && (
            <Stack component="form" direction={{xs: 'column', sm: 'row'}} spacing={1} onSubmit={event => submitReply(event, id)}>
              <TextField
                autoFocus
                fullWidth
                required
                size="small"
                value={replyContent}
                onChange={event => setReplyContent(event.target.value)}
                placeholder={t('feedback.replyPlaceholder')}
                inputProps={{maxLength: 1000}}
              />
              <Button type="submit" variant="contained" disabled={submittingReply || !replyContent.trim()}>
                {submittingReply ? t('feedback.sending') : t('feedback.sendReply')}
              </Button>
            </Stack>
          )}
          {!reply && (comment.replies || []).length > 0 && (
            <Stack spacing={1.25} sx={{pt: 0.5}}>
              {comment.replies.map(item => renderComment(item, {reply: true}))}
            </Stack>
          )}
        </Stack>
      </Paper>
    );
  }

  return (
    <Box component="section" aria-labelledby="feedback-title">
      <Stack sx={{mb: 2.5}}>
        <Box>
          <Typography id="feedback-title" component="h2" variant="h5" fontWeight={850}>
            {t('feedback.title')}
          </Typography>
          <Typography color="text.secondary">
            {t('feedback.description')}
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}
      {message && <Alert severity="success" sx={{mb: 2}}>{message}</Alert>}

      <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: '320px minmax(0, 1fr)'}, gap: 3}}>
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{p: 3}}>
            <Stack spacing={2} alignItems="flex-start">
              <Typography component="h3" variant="h6" fontWeight={800}>{t('feedback.score')}</Typography>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="h3" fontWeight={900}>{Number(rating.averageRating || 0).toFixed(1)}</Typography>
                <Box>
                  <Rating value={rating.averageRating || 0} precision={0.1} readOnly/>
                  <Typography variant="body2" color="text.secondary">{t('feedback.ratings',{count:rating.ratingCount || 0})}</Typography>
                </Box>
              </Stack>
              <Stack spacing={0.75} width="100%">
                {[5, 4, 3, 2, 1].map(value => {
                  const count = rating.distribution?.[value] || 0;
                  const percent = rating.ratingCount
                    ? count / rating.ratingCount * 100
                    : 0;
                  return (
                    <Stack key={value} direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" width={28}>{value}★</Typography>
                      <LinearProgress variant="determinate" value={percent} sx={{flexGrow: 1, height: 7, borderRadius: 4}}/>
                      <Typography variant="caption" width={24} textAlign="right">{count}</Typography>
                    </Stack>
                  );
                })}
              </Stack>
              <Divider flexItem/>
              {user ? (
                <Stack spacing={1.25} alignItems="flex-start">
                  <Typography fontWeight={750}>{t('feedback.yourRating')}</Typography>
                  <Rating
                    value={stars}
                    onChange={(_, value) => setStars(value || 0)}
                    size="large"
                  />
                  <Button
                    variant="contained"
                    disabled={!stars || submittingRating}
                    onClick={submitRating}
                  >
                    {submittingRating ? t('feedback.saving') : t('feedback.saveRating')}
                  </Button>
                </Stack>
              ) : (
                <Alert severity="info">
                  <Link to="/login">{t('feedback.login')}</Link> {t('feedback.toRate')}
                </Alert>
              )}
            </Stack>
          </Paper>
        </Stack>

        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography component="h3" variant="h6" fontWeight={800}>
              {t('feedback.latest')}
            </Typography>
            <Typography color="text.secondary">{t('feedback.comments',{count:comments.meta.totalItems})}</Typography>
          </Stack>
          <Paper component="form" variant="outlined" sx={{p: {xs: 2.25, sm: 3}}} onSubmit={submitComment}>
            <Stack spacing={2}>
              <Typography component="h4" variant="h6" fontWeight={800}>{t('feedback.write')}</Typography>
              {!user && (
                <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5}>
                  <TextField
                    required
                    fullWidth
                    size="small"
                    label={t('feedback.displayName')}
                    value={form.guestName}
                    onChange={change('guestName')}
                    inputProps={{maxLength: 100}}
                  />
                  <TextField
                    required
                    fullWidth
                    size="small"
                    type="email"
                    label={t('feedback.hiddenEmail')}
                    value={form.guestEmail}
                    onChange={change('guestEmail')}
                    inputProps={{maxLength: 254}}
                  />
                </Stack>
              )}
              <TextField
                required
                multiline
                minRows={3}
                label={t('feedback.content')}
                value={form.content}
                onChange={change('content')}
                inputProps={{maxLength: 1000}}
                helperText={`${form.content.length}/1000`}
              />
              <Button type="submit" variant="contained" disabled={submittingComment} sx={{alignSelf: {sm: 'flex-end'}, minWidth: 180}}>
                {submittingComment ? t('feedback.sending') : t('feedback.submit')}
              </Button>
            </Stack>
          </Paper>
          {loading && <Box sx={{display: 'grid', placeItems: 'center', minHeight: 180}}><CircularProgress/></Box>}
          {!loading && comments.items.length === 0 && (
            <Alert severity="info">{t('feedback.empty')}</Alert>
          )}
          {!loading && comments.items.map(comment => renderComment(comment))}
          {!loading && comments.meta.totalPages > 1 && (
            <Stack alignItems="center" sx={{pt: 1}}>
              <Pagination
                count={comments.meta.totalPages}
                page={Math.min(page, comments.meta.totalPages)}
                onChange={(_, value) => setPage(value)}
              />
            </Stack>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
