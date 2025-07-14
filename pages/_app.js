// pages/_app.js
import '../styles/globals.css';
import Layout from '../components/Layout';

export default function MyApp({ Component, pageProps }) {
  const getLayout =
    Component.getLayout ||
    ((page) => <Layout>{page}</Layout>);

  return getLayout(<Component {...pageProps} />);
}
