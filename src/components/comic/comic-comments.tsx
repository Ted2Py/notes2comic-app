"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import Link from "next/link";
import { Trash2, MessageCircle, Send, Heart, Reply, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth-client";
import { formatRelativeTime } from "@/lib/date";

interface Comment {
  id: string;
  content: string;
  isCensored: boolean;
  censoredContent: string | null;
  createdAt: string;
  parentId: string | null;
  likesCount: number;
  isLiked: boolean;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
  replies?: Comment[];
}

interface ComicCommentsProps {
  comicId: string;
  comicOwnerId: string;
}

export function ComicComments({ comicId, comicOwnerId }: ComicCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const currentSession = useSession();

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/comics/${comicId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  }, [comicId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    if (!currentSession.data) {
      toast.error("Please log in to comment");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/comics/${comicId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments([data.comment, ...comments]);
        setNewComment("");

        if (data.comment.isCensored) {
          toast.info("Your comment has been posted with some words filtered for appropriateness");
        } else {
          toast.success("Comment posted!");
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to post comment");
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (e: FormEvent, parentId: string) => {
    e.preventDefault();

    if (!replyText.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    if (!currentSession.data) {
      toast.error("Please log in to comment");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/comics/${comicId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText, parentId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the parent comment with the new reply
        setComments(comments.map(c => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), data.comment]
            };
          }
          return c;
        }));
        setReplyText("");
        setReplyTo(null);
        setExpandedReplies(new Set([...expandedReplies, parentId]));
        toast.success("Reply posted!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to post reply");
      }
    } catch (error) {
      console.error("Failed to post reply:", error);
      toast.error("Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!currentSession.data) return;

    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/comics/${comicId}/comments?commentId=${commentId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setComments(comments.filter((c) => c.id !== commentId));
        toast.success("Comment deleted");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete comment");
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const handleLike = async (commentId: string) => {
    if (!currentSession.data) {
      toast.error("Please log in to like comments");
      return;
    }

    try {
      const response = await fetch(`/api/comics/${comicId}/comments/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the like status in the comments
        const updateComment = (c: Comment): Comment => {
          if (c.id === commentId) {
            return {
              ...c,
              isLiked: data.liked,
              likesCount: data.likesCount ?? (data.liked ? c.likesCount + 1 : c.likesCount - 1)
            };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map(updateComment)
            };
          }
          return c;
        };
        setComments(comments.map(updateComment));
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      toast.error("Failed to like comment");
    }
  };

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedReplies(newExpanded);
  };

  const getDisplayContent = (comment: Comment) => {
    if (comment.isCensored && comment.censoredContent) {
      return comment.censoredContent;
    }
    return comment.content;
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const isOwner = comment.user.id === comicOwnerId;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedReplies.has(comment.id);

    return (
      <Card
        key={comment.id}
        className={isReply ? "ml-12 bg-muted/50 border-dashed" : ""}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Link href={`/profile/${comment.user.id}`}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={comment.user.image || undefined} />
                <AvatarFallback>
                  {comment.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/profile/${comment.user.id}`}
                    className="font-semibold hover:underline"
                  >
                    {comment.user.name}
                  </Link>
                  {isOwner && (
                    <Badge variant="secondary" className="text-xs">
                      Creator
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {currentSession.data?.user?.id === comment.user.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words mb-2">
                {getDisplayContent(comment)}
              </p>
              {comment.isCensored && (
                <p className="text-xs text-muted-foreground mb-2 italic">
                  (Some words have been filtered for appropriateness)
                </p>
              )}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLike(comment.id)}
                  className={`h-7 px-2 gap-1 ${comment.isLiked ? "text-red-500" : ""}`}
                >
                  <Heart className={`h-3.5 w-3.5 ${comment.isLiked ? "fill-current" : ""}`} />
                  <span className="text-xs">{comment.likesCount || 0}</span>
                </Button>
                {!isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyTo(comment.id);
                      setReplyText("");
                    }}
                    className="h-7 px-2 gap-1"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    <span className="text-xs">Reply</span>
                  </Button>
                )}
                {hasReplies && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleReplies(comment.id)}
                    className="h-7 px-2 gap-1"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    <span className="text-xs">{comment.replies?.length || 0}</span>
                  </Button>
                )}
              </div>
              {replyTo === comment.id && (
                <form onSubmit={(e) => handleReplySubmit(e, comment.id)} className="mt-3 space-y-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Replying to ${comment.user.name}...`}
                    rows={2}
                    disabled={submitting}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyTo(null);
                        setReplyText("");
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submitting || !replyText.trim()}
                    >
                      {submitting ? "Posting..." : "Post Reply"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading comments...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comment Form */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              disabled={submitting || !currentSession.data}
            />
            <div className="flex items-center justify-between">
              {!currentSession.data && (
                <p className="text-sm text-muted-foreground">
                  Please <Link href="/login" className="text-primary hover:underline">log in</Link> to comment
                </p>
              )}
              <div className="flex gap-2 ml-auto">
                {newComment && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewComment("")}
                    disabled={submitting}
                  >
                    Clear
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={submitting || !newComment.trim() || !currentSession.data}
                >
                  {submitting ? (
                    "Posting..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Post Comment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Comments List */}
      {comments.length === 0 ? (
        <Card>
          <CardContent className="p-16 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No comments yet</h3>
            <p className="text-muted-foreground">
              Be the first to leave a comment on this comic!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id}>
              {renderComment(comment)}
              {comment.replies && comment.replies.length > 0 && expandedReplies.has(comment.id) && (
                <div className="mt-2 space-y-2">
                  {comment.replies.map((reply) => renderComment(reply, true))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
