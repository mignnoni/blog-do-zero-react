import { format } from 'date-fns';
import { GetStaticPaths, GetStaticProps } from 'next';

import Prismic from '@prismicio/client';

import ptBR from 'date-fns/locale/pt-BR';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import hash from 'object-hash';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Header from '../../components/Header';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();
  if (router.isFallback) {
    return <span>Carregando...</span>;
  }

  /* eslint-disable no-param-reassign */
  const totalWords = post.data.content.reduce((total, contentItem) => {
    const bodyText = RichText.asText(contentItem.body);

    total += contentItem.heading.split(' ').length;
    total += bodyText.split(' ').length;

    return total;
  }, 0);
  /* eslint-enable no-param-reassign */

  const readingTime = Math.ceil(totalWords / 200);

  return (
    <>
      <Header />
      <div className={styles.banner}>
        <img src={post.data.banner.url} alt="banner" height="400px" />
      </div>
      <main className={commonStyles.content}>
        <article className={styles.post}>
          <h1>{post.data.title}</h1>
          <ul className={styles.info}>
            <li>
              <FiCalendar size={20} />
              <time className={styles.listItem}>
                {post.first_publication_date}
              </time>
            </li>
            <li>
              <FiUser size={20} />
              <span className={styles.listItem}>{post.data.author}</span>
            </li>
            <li>
              <FiClock size={20} />
              <span className={styles.listItem}>{readingTime} min</span>
            </li>
          </ul>
          {post.data.content.map(content => (
            <section
              key={hash({ ...content, ts: new Date().getTime() })}
              className={styles.postContent}
            >
              <h2 className={styles.contentHeading}>{content.heading}</h2>
              <div
                className={styles.contentBody}
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </section>
          ))}
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 2,
    }
  );

  return {
    paths: posts.results.map(post => ({ params: { slug: post.uid } })),
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const contentArray = response.data.content.map(content => {
    return {
      heading: RichText.asText(content.heading),
      body: [...content.body],
    };
  });

  const post = {
    first_publication_date: format(
      new Date(response.first_publication_date),
      'dd MMM yyyy',
      { locale: ptBR }
    ),
    data: {
      title: RichText.asText(response.data.title),
      banner: {
        url: response.data.banner.url,
      },
      author: RichText.asText(response.data.author),
      content: contentArray,
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 15,
  };
};
