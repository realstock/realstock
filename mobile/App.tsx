import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <WebView 
        source={{ uri: 'https://www.realstock.com.br' }} 
        style={styles.webview}
        allowsBackForwardNavigationGestures={true}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // slate-950 default to match RealStock dark mode edges
    paddingTop: Platform.OS === 'android' ? 25 : 0, // avoid top notch on some android devices
  },
  webview: {
    flex: 1,
    backgroundColor: '#020617',
  }
});
