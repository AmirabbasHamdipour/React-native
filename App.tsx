// App.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type APIResponseChunk = {
  choices: Array<{
    delta: {
      content?: string;
    };
  }>;
};

export default function App() {
  // State management
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'سلام! من دستیار هوش مصنوعی شما هستم. چگونه می‌توانم کمک‌تان کنم؟',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Function to send message to API
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    // Add temporary assistant message
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    };
    setMessages(prev => [...prev, assistantMessage]);
    
    setIsLoading(true);
    setIsStreaming(true);

    // Prepare messages for API (without the empty assistant message)
    const messagesForAPI = [
      ...messages,
      { role: 'user' as const, content: inputText.trim() }
    ].filter(msg => !(msg.role === 'assistant' && msg.content === ''));

    // Prepare request body
    const requestBody = {
      messages: messagesForAPI.map(({ role, content }) => ({ role, content })),
      model: 'gpt-5-nano',
      stream: true,
    };

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('https://text.pollinations.ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          setIsStreaming(false);
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            
            if (data === '[DONE]') {
              setIsStreaming(false);
              break;
            }

            try {
              const parsed: APIResponseChunk = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                accumulatedContent += content;
                
                // Update the assistant's message with new content
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  
                  if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      content: accumulatedContent,
                    };
                  }
                  
                  return newMessages;
                });
              }
            } catch (error) {
              console.error('Error parsing SSE data:', error);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Error sending message:', error);
        
        // Update assistant message with error
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          
          if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content: 'متاسفانه در برقراری ارتباط مشکلی پیش آمده. لطفا دوباره تلاش کنید.',
            };
          }
          
          return newMessages;
        });
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Render chat message
  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.assistantMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userMessageBubble : styles.assistantMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.assistantMessageText
          ]}>
            {item.content || (isStreaming && item.role === 'assistant' ? 'در حال پردازش...' : '')}
          </Text>
        </View>
        <Text style={styles.messageRole}>
          {isUser ? 'شما' : 'دستیار'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>چت‌بات هوش مصنوعی</Text>
          <Text style={styles.headerSubtitle}>با GPT-5 Nano</Text>
        </View>

        {/* Chat Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          inverted={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="پیام خود را بنویسید..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            textAlign="right"
            editable={!isLoading}
            onSubmitEditing={sendMessage}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>ارسال</Text>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Status Indicator */}
        {isStreaming && (
          <View style={styles.streamingIndicator}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.streamingText}>در حال دریافت پاسخ...</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#388E3C',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'white',
    marginTop: 4,
    textAlign: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 8,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  userMessageBubble: {
    backgroundColor: '#4CAF50',
    borderBottomRightRadius: 4,
  },
  assistantMessageBubble: {
    backgroundColor: '#e0e0e0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'right',
  },
  userMessageText: {
    color: 'white',
  },
  assistantMessageText: {
    color: '#333',
  },
  messageRole: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
    textAlignVertical: 'center',
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: '#a5d6a7',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  streamingIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  streamingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
});