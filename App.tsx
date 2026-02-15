import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Provider as PaperProvider,
  DefaultTheme,
  DarkTheme,
  Button,
  Card,
  Paragraph,
  Divider,
  Switch,
  Avatar,
  IconButton,
  Chip,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import Video from 'react-native-video';
import Progress from 'react-native-progress';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';

// -------------------- Configuration --------------------
const API_BASE_URL = 'https://tweeter.runflare.run';
const STATIC_BASE_URL = 'https://tweeter.runflare.run/static';

// -------------------- Types --------------------
interface User {
  id: number;
  username: string;
  bio: string;
  profile_image: string | null;
  is_blue: boolean;
  created_at: string;
  posts_count?: number;
  bookmarks_count?: number;
}

interface Post {
  id: number;
  user_id: number;
  caption: string;
  media_type: 'image' | 'video' | 'audio' | 'file' | 'text';
  media_path: string | null;
  thumbnail_path: string | null;
  created_at: string;
  username: string;
  profile_image: string | null;
  is_blue: boolean;
  likes_count: number;
  comments_count: number;
  liked_by_user?: boolean;
  bookmarked_by_user?: boolean;
}

interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  created_at: string;
  username: string;
  profile_image: string | null;
  is_blue: boolean;
  likes_count: number;
  liked_by_user: boolean;
}

interface GroupMessage {
  id: number;
  sender_id: number;
  content: string | null;
  media_type: string | null;
  media_path: string | null;
  created_at: string;
  username: string;
  profile_image: string | null;
  is_blue: boolean;
}

// -------------------- Context --------------------
interface AuthContextType {
  user: User | null;
  userId: number | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, password: string, bio: string, profileImage?: any) => Promise<void>;
  updateProfile: (bio?: string, profileImage?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// -------------------- API Helpers --------------------
const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const userId = await AsyncStorage.getItem('userId');
  if (userId) {
    config.params = { ...config.params, user_id: userId };
  }
  return config;
});

// -------------------- Components --------------------
const LoadingSpinner = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#1DA1F2" />
  </View>
);

const MediaThumbnail = ({ mediaPath, thumbnailPath, mediaType, style }) => {
  const uri = thumbnailPath ? `${STATIC_BASE_URL}/${thumbnailPath}` : (mediaPath ? `${STATIC_BASE_URL}/${mediaPath}` : null);
  if (!uri) return null;
  if (mediaType === 'image') {
    return <Image source={{ uri }} style={style} resizeMode="cover" />;
  } else if (mediaType === 'video') {
    return (
      <View>
        <Image source={{ uri }} style={style} resizeMode="cover" />
        <Icon name="play-circle" size={40} color="white" style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -20 }} />
      </View>
    );
  } else if (mediaType === 'audio') {
    return (
      <View style={[style, { backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' }]}>
        <Icon name="music" size={40} color="#666" />
      </View>
    );
  } else if (mediaType === 'file') {
    return (
      <View style={[style, { backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' }]}>
        <Icon name="file" size={40} color="#666" />
      </View>
    );
  }
  return null;
};

const PostCard = ({ post, onPress, onLike, onBookmark }) => {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInUp} layout={Layout.springify()}>
      <Card style={{ margin: 10 }} onPress={onPress}>
        <Card.Title
          title={post.username}
          subtitle={new Date(post.created_at).toLocaleString()}
          left={(props) =>
            post.profile_image ? (
              <Avatar.Image {...props} source={{ uri: `${STATIC_BASE_URL}/${post.profile_image}` }} />
            ) : (
              <Avatar.Icon {...props} icon="account" />
            )
          }
          right={(props) => post.is_blue && <Icon {...props} name="check-decagram" size={20} color="#1DA1F2" />}
        />
        {post.media_path && (
          <Card.Content>
            <MediaThumbnail
              mediaPath={post.media_path}
              thumbnailPath={post.thumbnail_path}
              mediaType={post.media_type}
              style={{ width: '100%', height: 200, borderRadius: 10 }}
            />
          </Card.Content>
        )}
        <Card.Content>
          <Paragraph>{post.caption}</Paragraph>
        </Card.Content>
        <Card.Actions>
          <IconButton icon="heart" color={post.liked_by_user ? 'red' : colors.text} onPress={() => onLike(post.id)} />
          <Text>{post.likes_count}</Text>
          <IconButton icon="comment" onPress={onPress} />
          <Text>{post.comments_count}</Text>
          <IconButton icon="bookmark" color={post.bookmarked_by_user ? 'gold' : colors.text} onPress={() => onBookmark(post.id)} />
        </Card.Actions>
      </Card>
    </Animated.View>
  );
};

const CommentItem = ({ comment, onLike, userId, level = 0 }) => {
  const { colors } = useTheme();
  return (
    <View style={{ marginLeft: level * 20, marginVertical: 5, paddingHorizontal: 10 }}>
      <View style={{ flexDirection: 'row' }}>
        {comment.profile_image ? (
          <Avatar.Image size={30} source={{ uri: `${STATIC_BASE_URL}/${comment.profile_image}` }} />
        ) : (
          <Avatar.Icon size={30} icon="account" />
        )}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold' }}>{comment.username}</Text>
            {comment.is_blue && <Icon name="check-decagram" size={16} color="#1DA1F2" style={{ marginLeft: 5 }} />}
            <Text style={{ color: colors.text, fontSize: 12, marginLeft: 10 }}>{new Date(comment.created_at).toLocaleString()}</Text>
          </View>
          <Text>{comment.content}</Text>
          <View style={{ flexDirection: 'row', marginTop: 5 }}>
            <IconButton icon="heart" size={20} color={comment.liked_by_user ? 'red' : colors.text} onPress={() => onLike(comment.id)} />
            <Text style={{ alignSelf: 'center' }}>{comment.likes_count}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// -------------------- Screens --------------------

// Login Screen
const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useContext(AuthContext);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await auth.login(username, password);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Animated.View entering={FadeInDown}>
        <Text style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>Welcome Back</Text>
        <TextInput
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          style={{ borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 10, marginBottom: 15 }}
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 10, marginBottom: 20 }}
        />
        <Button mode="contained" onPress={handleLogin} loading={loading} disabled={loading} style={{ borderRadius: 10 }}>
          Login
        </Button>
        <Button onPress={() => navigation.navigate('Register')} style={{ marginTop: 10 }}>
          Don't have an account? Register
        </Button>
      </Animated.View>
    </SafeAreaView>
  );
};

// Register Screen
const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const auth = useContext(AuthContext);

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo', includeBase64: false }, (response) => {
      if (response.didCancel) return;
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      if (response.assets && response.assets.length > 0) {
        setProfileImage(response.assets[0]);
      }
    });
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      await auth.register(username, password, bio, profileImage);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <ScrollView>
        <Animated.View entering={FadeInDown}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>Create Account</Text>
          <TouchableOpacity onPress={pickImage} style={{ alignItems: 'center', marginBottom: 20 }}>
            {profileImage ? (
              <Image source={{ uri: profileImage.uri }} style={{ width: 100, height: 100, borderRadius: 50 }} />
            ) : (
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' }}>
                <Icon name="camera" size={40} color="#666" />
              </View>
            )}
          </TouchableOpacity>
          <TextInput
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            style={{ borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 10, marginBottom: 15 }}
            autoCapitalize="none"
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{ borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 10, marginBottom: 15 }}
          />
          <TextInput
            placeholder="Bio"
            value={bio}
            onChangeText={setBio}
            multiline
            style={{ borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 10, marginBottom: 20, height: 100 }}
          />
          <Button mode="contained" onPress={handleRegister} loading={loading} disabled={loading} style={{ borderRadius: 10 }}>
            Register
          </Button>
          <Button onPress={() => navigation.goBack()} style={{ marginTop: 10 }}>
            Already have an account? Login
          </Button>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Home Feed Screen
const HomeScreen = ({ navigation }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const auth = useContext(AuthContext);
  const { colors } = useTheme();

  const fetchPosts = async (pageNum = 1, refresh = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.get('/posts', { params: { page: pageNum, per_page: 10 } });
      const newPosts = res.data;
      if (refresh) {
        setPosts(newPosts);
        setHasMore(newPosts.length === 10);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
        setHasMore(newPosts.length === 10);
      }
      setPage(pageNum);
    } catch (err) {
      Alert.alert('Error', 'Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts(1, true);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts(1, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchPosts(page + 1);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      const res = await api.post('/like', { post_id: postId, user_id: auth.userId });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked_by_user: res.data.liked, likes_count: p.likes_count + (res.data.liked ? 1 : -1) } : p));
    } catch (err) {
      Alert.alert('Error', 'Failed to like');
    }
  };

  const handleBookmark = async (postId: number) => {
    try {
      const res = await api.post('/bookmark', { post_id: postId, user_id: auth.userId });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, bookmarked_by_user: res.data.bookmarked } : p));
    } catch (err) {
      Alert.alert('Error', 'Failed to bookmark');
    }
  };

  const renderItem = ({ item }) => (
    <PostCard
      post={item}
      onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
      onLike={handleLike}
      onBookmark={handleBookmark}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListFooterComponent={loading ? <ActivityIndicator size="small" color="#1DA1F2" /> : null}
      />
    </View>
  );
};

// Post Detail Screen
const PostDetailScreen = ({ route, navigation }) => {
  const { postId } = route.params;
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const auth = useContext(AuthContext);
  const { colors } = useTheme();

  const fetchPost = async () => {
    try {
      const res = await api.get(`/post/${postId}`, { params: { user_id: auth.userId } });
      setPost(res.data);
      setComments(res.data.comments || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const handleLikePost = async () => {
    try {
      const res = await api.post('/like', { post_id: postId, user_id: auth.userId });
      setPost(prev => ({ ...prev, liked_by_user: res.data.liked, likes_count: prev.likes_count + (res.data.liked ? 1 : -1) }));
    } catch (err) {
      Alert.alert('Error', 'Failed to like');
    }
  };

  const handleBookmarkPost = async () => {
    try {
      const res = await api.post('/bookmark', { post_id: postId, user_id: auth.userId });
      setPost(prev => ({ ...prev, bookmarked_by_user: res.data.bookmarked }));
    } catch (err) {
      Alert.alert('Error', 'Failed to bookmark');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await api.post('/comment', {
        post_id: postId,
        user_id: auth.userId,
        content: commentText,
        parent_id: replyTo?.id || null,
      });
      setCommentText('');
      setReplyTo(null);
      fetchPost();
    } catch (err) {
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleLikeComment = async (commentId: number) => {
    try {
      await api.post(`/comment/${commentId}/like`, { user_id: auth.userId });
      fetchPost();
    } catch (err) {
      Alert.alert('Error', 'Failed to like comment');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView>
        {post && (
          <>
            <PostCard post={post} onPress={() => {}} onLike={handleLikePost} onBookmark={handleBookmarkPost} />
            <Divider />
            <View style={{ padding: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Comments</Text>
              {comments.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 20 }}>No comments yet.</Text>
              ) : (
                comments.map(c => (
                  <CommentItem key={c.id} comment={c} onLike={handleLikeComment} userId={auth.userId} />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
          {replyTo && (
            <Chip onClose={() => setReplyTo(null)} style={{ marginRight: 5 }}>
              Replying to {replyTo.username}
            </Chip>
          )}
          <TextInput
            style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8 }}
            placeholder="Add a comment..."
            value={commentText}
            onChangeText={setCommentText}
          />
          <IconButton icon="send" onPress={handleAddComment} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Create Post Screen (with media editing)
const CreatePostScreen = ({ navigation }) => {
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState<'image'|'video'|'audio'|'file'|null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const auth = useContext(AuthContext);

  const pickMedia = () => {
    launchImageLibrary({ mediaType: 'mixed', includeBase64: false }, (response) => {
      if (response.didCancel) return;
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        setMedia(asset);
        if (asset.type?.startsWith('image')) {
          setMediaType('image');
          setEditing(true);
        } else if (asset.type?.startsWith('video')) {
          setMediaType('video');
          setEditing(false);
        } else {
          setMediaType('file');
          setEditing(false);
        }
      }
    });
  };

  const editImage = async () => {
    if (!media) return;
    try {
      const resized = await ImageResizer.createResizedImage(
        media.uri,
        800,
        800,
        'JPEG',
        80
      );
      setMedia({ ...media, uri: resized.uri });
      setEditing(false);
      Alert.alert('Success', 'Image resized successfully');
    } catch (err) {
      Alert.alert('Error', 'Failed to edit image');
    }
  };

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append('user_id', auth.userId.toString());
    formData.append('caption', caption);
    if (media) {
      formData.append('media', {
        uri: media.uri,
        type: media.type || 'image/jpeg',
        name: media.fileName || 'media.jpg',
      } as any);
    }

    setUploading(true);
    try {
      await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        },
      });
      Alert.alert('Success', 'Post uploaded');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <ScrollView>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Create Post</Text>
        <TouchableOpacity onPress={pickMedia} style={{ alignItems: 'center', marginBottom: 20 }}>
          {media ? (
            mediaType === 'image' ? (
              <Image source={{ uri: media.uri }} style={{ width: '100%', height: 200, borderRadius: 10 }} />
            ) : mediaType === 'video' ? (
              <View style={{ width: '100%', height: 200, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderRadius: 10 }}>
                <Icon name="video" size={50} color="#fff" />
                <Icon name="play-circle" size={50} color="white" style={{ position: 'absolute' }} />
              </View>
            ) : (
              <View style={{ width: '100%', height: 200, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center', borderRadius: 10 }}>
                <Icon name="file" size={50} />
              </View>
            )
          ) : (
            <View style={{ width: '100%', height: 200, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center', borderRadius: 10 }}>
              <Icon name="camera-plus" size={50} color="#666" />
              <Text>Tap to select media</Text>
            </View>
          )}
        </TouchableOpacity>
        {editing && mediaType === 'image' && (
          <Button mode="outlined" onPress={editImage} style={{ marginBottom: 10 }}>Edit Image (Resize)</Button>
        )}
        <TextInput
          placeholder="Caption"
          value={caption}
          onChangeText={setCaption}
          multiline
          style={{ borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 10, marginBottom: 20, height: 100 }}
        />
        {uploading && (
          <View style={{ marginBottom: 20 }}>
            <Progress.Bar progress={uploadProgress / 100} width={null} />
            <Text style={{ textAlign: 'center' }}>{uploadProgress}%</Text>
          </View>
        )}
        <Button mode="contained" onPress={handleUpload} disabled={uploading} style={{ borderRadius: 10 }}>
          Upload
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

// Profile Screen
const ProfileScreen = ({ navigation, route }) => {
  const userId = route.params?.userId;
  const auth = useContext(AuthContext);
  const [profile, setProfile] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isOwnProfile = userId === auth.userId;

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/profile/${userId || auth.userId}`);
      setProfile(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load profile');
    }
  };

  const fetchUserPosts = async () => {
    try {
      const res = await api.get('/posts', { params: { user_id: userId || auth.userId } });
      setUserPosts(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load posts');
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchProfile(), fetchUserPosts()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => auth.logout() },
    ]);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View style={{ alignItems: 'center', padding: 20 }}>
          {profile.profile_image ? (
            <Avatar.Image size={100} source={{ uri: `${STATIC_BASE_URL}/${profile.profile_image}` }} />
          ) : (
            <Avatar.Icon size={100} icon="account" />
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{profile.username}</Text>
            {profile.is_blue && <Icon name="check-decagram" size={20} color="#1DA1F2" style={{ marginLeft: 5 }} />}
          </View>
          <Text style={{ marginTop: 5, color: 'gray' }}>{profile.bio || 'No bio'}</Text>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <View style={{ alignItems: 'center', marginHorizontal: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{profile.posts_count}</Text>
              <Text>Posts</Text>
            </View>
            <View style={{ alignItems: 'center', marginHorizontal: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{profile.bookmarks_count}</Text>
              <Text>Bookmarks</Text>
            </View>
          </View>
          {isOwnProfile && (
            <View style={{ flexDirection: 'row', marginTop: 20 }}>
              <Button mode="contained" onPress={() => navigation.navigate('EditProfile')} style={{ marginRight: 10 }}>
                Edit Profile
              </Button>
              <Button mode="outlined" onPress={handleLogout}>
                Logout
              </Button>
            </View>
          )}
        </View>
        <Divider />
        <View style={{ padding: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Posts</Text>
          {userPosts.length === 0 ? (
            <Text style={{ textAlign: 'center' }}>No posts yet.</Text>
          ) : (
            userPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                onLike={() => {}}
                onBookmark={() => {}}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Edit Profile Screen
const EditProfileScreen = ({ navigation }) => {
  const auth = useContext(AuthContext);
  const [bio, setBio] = useState(auth.user?.bio || '');
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel) return;
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      if (response.assets && response.assets.length > 0) {
        setProfileImage(response.assets[0]);
      }
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await auth.updateProfile(bio, profileImage);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <ScrollView>
        <TouchableOpacity onPress={pickImage} style={{ alignItems: 'center', marginBottom: 20 }}>
          {profileImage ? (
            <Image source={{ uri: profileImage.uri }} style={{ width: 100, height: 100, borderRadius: 50 }} />
          ) : auth.user?.profile_image ? (
            <Image source={{ uri: `${STATIC_BASE_URL}/${auth.user.profile_image}` }} style={{ width: 100, height: 100, borderRadius: 50 }} />
          ) : (
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' }}>
              <Icon name="camera" size={40} color="#666" />
            </View>
          )}
        </TouchableOpacity>
        <TextInput
          placeholder="Bio"
          value={bio}
          onChangeText={setBio}
          multiline
          style={{ borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 10, marginBottom: 20, height: 100 }}
        />
        <Button mode="contained" onPress={handleSave} loading={loading} disabled={loading}>
          Save
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

// Bookmarks Screen
const BookmarksScreen = ({ navigation }) => {
  const [bookmarks, setBookmarks] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = useContext(AuthContext);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const res = await api.get(`/bookmarks/${auth.userId}`);
      setBookmarks(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={bookmarks}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            onLike={() => {}}
            onBookmark={() => {}}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50 }}>No bookmarks yet.</Text>}
      />
    </SafeAreaView>
  );
};

// Direct Messages List Screen
const DirectMessagesListScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 10 }}>
        <Button mode="contained" onPress={() => navigation.navigate('NewDirectMessage')}>New Message</Button>
      </View>
      <FlatList
        data={[]}
        renderItem={null}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50 }}>No conversations yet.</Text>}
      />
    </SafeAreaView>
  );
};

// New Direct Message Screen
const NewDirectMessageScreen = ({ navigation }) => {
  const [receiverId, setReceiverId] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const auth = useContext(AuthContext);

  const pickMedia = () => {
    launchImageLibrary({ mediaType: 'mixed' }, (response) => {
      if (response.didCancel) return;
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      if (response.assets && response.assets.length > 0) {
        setMedia(response.assets[0]);
      }
    });
  };

  const sendMessage = async () => {
    if (!receiverId.trim()) {
      Alert.alert('Error', 'Receiver ID is required');
      return;
    }
    const formData = new FormData();
    formData.append('sender_id', auth.userId.toString());
    formData.append('receiver_id', receiverId);
    formData.append('content', content);
    if (media) {
      formData.append('media', {
        uri: media.uri,
        type: media.type || 'image/jpeg',
        name: media.fileName || 'media.jpg',
      } as any);
    }
    setUploading(true);
    try {
      await api.post('/direct/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        },
      });
      Alert.alert('Success', 'Message sent');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <TextInput
        placeholder="Receiver User ID"
        value={receiverId}
        onChangeText={setReceiverId}
        keyboardType="numeric"
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 10, marginBottom: 15 }}
      />
      <TextInput
        placeholder="Message"
        value={content}
        onChangeText={setContent}
        multiline
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 10, marginBottom: 15, height: 100 }}
      />
      <TouchableOpacity onPress={pickMedia} style={{ marginBottom: 15 }}>
        {media ? (
          <Image source={{ uri: media.uri }} style={{ width: '100%', height: 100 }} />
        ) : (
          <View style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 10, alignItems: 'center' }}>
            <Icon name="attachment" size={30} />
            <Text>Attach Media</Text>
          </View>
        )}
      </TouchableOpacity>
      {uploading && <Progress.Bar progress={uploadProgress / 100} width={null} />}
      <Button mode="contained" onPress={sendMessage} disabled={uploading}>Send</Button>
    </SafeAreaView>
  );
};

// Group Chat Screen
const GroupChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [input, setInput] = useState('');
  const [media, setMedia] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const auth = useContext(AuthContext);
  const flatListRef = useRef(null);

  const fetchMessages = async (pageNum = 1, refresh = false) => {
    try {
      const res = await api.get('/group/messages', { params: { page: pageNum, per_page: 20 } });
      const newMessages = res.data;
      if (refresh) {
        setMessages(newMessages.reverse());
        setHasMore(newMessages.length === 20);
      } else {
        setMessages(prev => [...newMessages.reverse(), ...prev]);
        setHasMore(newMessages.length === 20);
      }
      setPage(pageNum);
    } catch (err) {
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMessages(1, true);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() && !media) return;
    const formData = new FormData();
    formData.append('sender_id', auth.userId.toString());
    formData.append('content', input);
    if (media) {
      formData.append('media', {
        uri: media.uri,
        type: media.type || 'image/jpeg',
        name: media.fileName || 'media.jpg',
      } as any);
    }
    setUploading(true);
    try {
      await api.post('/group/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        },
      });
      setInput('');
      setMedia(null);
      fetchMessages(1, true);
    } catch (err) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender_id === auth.userId;
    return (
      <View style={{ flexDirection: isMe ? 'row-reverse' : 'row', marginVertical: 5, paddingHorizontal: 10 }}>
        {item.profile_image ? (
          <Avatar.Image size={40} source={{ uri: `${STATIC_BASE_URL}/${item.profile_image}` }} />
        ) : (
          <Avatar.Icon size={40} icon="account" />
        )}
        <View style={{ maxWidth: '70%', marginHorizontal: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold' }}>{item.username}</Text>
            {item.is_blue && <Icon name="check-decagram" size={16} color="#1DA1F2" style={{ marginLeft: 5 }} />}
          </View>
          {item.media_path && (
            item.media_type === 'video' ? (
              <Video
                source={{ uri: `${STATIC_BASE_URL}/${item.media_path}` }}
                style={{ width: 200, height: 200, borderRadius: 10, marginVertical: 5 }}
                controls
                paused
              />
            ) : item.media_type === 'image' ? (
              <Image source={{ uri: `${STATIC_BASE_URL}/${item.media_path}` }} style={{ width: 200, height: 200, borderRadius: 10, marginVertical: 5 }} />
            ) : (
              <View style={{ width: 200, height: 50, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }}>
                <Icon name="file" size={30} />
                <Text>{item.media_type}</Text>
              </View>
            )
          )}
          {item.content && <Text style={{ backgroundColor: isMe ? '#DCF8C6' : '#EEE', padding: 10, borderRadius: 10 }}>{item.content}</Text>}
          <Text style={{ fontSize: 10, color: 'gray', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>{new Date(item.created_at).toLocaleTimeString()}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        onEndReached={() => hasMore && fetchMessages(page + 1)}
        onEndReachedThreshold={0.1}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchMessages(1, true)} />}
        ListFooterComponent={loading ? <ActivityIndicator /> : null}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#ccc' }}>
          <IconButton icon="attachment" onPress={pickMedia} />
          <TextInput
            style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8 }}
            placeholder="Type a message"
            value={input}
            onChangeText={setInput}
          />
          <IconButton icon="send" onPress={sendMessage} disabled={uploading} />
        </View>
        {uploading && <Progress.Bar progress={uploadProgress / 100} width={null} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Settings Screen
const SettingsScreen = ({ navigation }) => {
  const theme = useContext(ThemeContext);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>Dark Mode</Text>
            <Switch value={theme.isDark} onValueChange={theme.toggleTheme} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// -------------------- Navigation --------------------
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const HomeStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Feed" component={HomeScreen} options={{ title: 'Home' }} />
    <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Post' }} />
    <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: 'Create Post' }} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
  </Stack.Navigator>
);

const MessagesStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="DirectMessagesList" component={DirectMessagesListScreen} options={{ title: 'Direct Messages' }} />
    <Stack.Screen name="NewDirectMessage" component={NewDirectMessageScreen} options={{ title: 'New Message' }} />
  </Stack.Navigator>
);

const GroupChatStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="GroupChat" component={GroupChatScreen} options={{ title: 'Global Chat' }} />
  </Stack.Navigator>
);

const BookmarksStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Bookmarks" component={BookmarksScreen} options={{ title: 'Bookmarks' }} />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
  </Stack.Navigator>
);

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Profile') iconName = 'account';
          else if (route.name === 'Messages') iconName = 'message';
          else if (route.name === 'Group') iconName = 'chat';
          else if (route.name === 'Bookmarks') iconName = 'bookmark';
          else if (route.name === 'Settings') iconName = 'cog';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1DA1F2',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
      <Tab.Screen name="Messages" component={MessagesStack} />
      <Tab.Screen name="Group" component={GroupChatStack} />
      <Tab.Screen name="Bookmarks" component={BookmarksStack} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// -------------------- Root Navigation --------------------
const RootNavigator = () => {
  const auth = useContext(AuthContext);
  return (
    <NavigationContainer>
      {auth.user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};

// -------------------- Providers --------------------
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        const id = parseInt(storedUserId);
        setUserId(id);
        const res = await api.get(`/profile/${id}`);
        setUser(res.data);
      }
    } catch (err) {
      console.log('Failed to load stored user', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const res = await api.post('/login', { username, password });
    const id = res.data.user_id;
    await AsyncStorage.setItem('userId', id.toString());
    setUserId(id);
    const profileRes = await api.get(`/profile/${id}`);
    setUser(profileRes.data);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userId');
    setUser(null);
    setUserId(null);
  };

  const register = async (username: string, password: string, bio: string, profileImage?: any) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('bio', bio);
    if (profileImage) {
      formData.append('profile_image', {
        uri: profileImage.uri,
        type: profileImage.type || 'image/jpeg',
        name: profileImage.fileName || 'profile.jpg',
      } as any);
    }
    await api.post('/register', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  };

  const updateProfile = async (bio?: string, profileImage?: any) => {
    const formData = new FormData();
    formData.append('user_id', userId.toString());
    if (bio !== undefined) formData.append('bio', bio);
    if (profileImage) {
      formData.append('profile_image', {
        uri: profileImage.uri,
        type: profileImage.type || 'image/jpeg',
        name: profileImage.fileName || 'profile.jpg',
      } as any);
    }
    await api.put(`/profile/${userId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    const profileRes = await api.get(`/profile/${userId}`);
    setUser(profileRes.data);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <AuthContext.Provider value={{ user, userId, login, logout, register, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const toggleTheme = () => setIsDark(prev => !prev);
  const theme = isDark ? DarkTheme : DefaultTheme;
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <PaperProvider theme={theme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
};

// Helper hook for theme
const useTheme = () => {
  const theme = useContext(ThemeContext);
  const paperTheme = useContext(PaperProvider);
  return { colors: paperTheme.theme.colors, isDark: theme?.isDark, toggleTheme: theme?.toggleTheme };
};

// -------------------- Main App --------------------
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}