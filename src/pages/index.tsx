import { GetStaticProps } from 'next';
import Head from 'next/head';

import Prismic from '@prismicio/client';

import Image from 'next/image';
import { FiCalendar, FiUser } from 'react-icons/fi';
import { RichText } from 'prismic-dom';
import Link from 'next/link';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import ApiSearchResponse from '@prismicio/client/types/ApiSearchResponse';
import { useState } from 'react';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const [nextPageUrl, setNextPageUrl] = useState<string>(
    postsPagination.next_page
  );

  const [nextPage, setNextPage] = useState<Post[]>([]);

  function resultsPosts(response: ApiSearchResponse): Post[] {
    return response.results.map(post => {
      return {
        uid: post.uid,
        data: {
          title: RichText.asText(post.data.title),
          subtitle: RichText.asText(post.data.subtitle),
          author: RichText.asText(post.data.author),
        },
        first_publication_date: format(
          new Date(post.first_publication_date),
          'dd MMM yyyy',
          {
            locale: ptBR,
          }
        ),
      };
    });
  }

  function handleLoadNextPage(): void {
    fetch(nextPageUrl)
      .then(response => response.json() as Promise<ApiSearchResponse>)
      .then(data => {
        const newPosts: Post[] = resultsPosts(data);

        const newPage = [...nextPage, ...newPosts];
        setNextPage(newPage);

        if (data.next_page) {
          setNextPageUrl(data.next_page);
        } else {
          setNextPageUrl(null);
        }
      });
  }

  return (
    <>
      <Head>
        <title>Home | Spacetraveling</title>
      </Head>
      <main className={`${commonStyles.content} ${styles.container}`}>
        <header className={styles.logo}>
          <Image src="/logo.svg" alt="logo" width={200} height={27} />
        </header>
        {postsPagination.results.map(post => (
          <Link href={`/post/${post.uid}`} key={post.uid}>
            <div className={styles.posts}>
              <a>
                <h2>{post.data.title}</h2>
                <p className={styles.subtitle}>{post.data.subtitle}</p>
                <div className={styles.infoContainer}>
                  <div className={styles.info}>
                    <FiCalendar size={20} />
                    <time>{post.first_publication_date}</time>
                  </div>
                  <div className={styles.info}>
                    <FiUser size={20} />
                    <p>{post.data.author}</p>
                  </div>
                </div>
              </a>
            </div>
          </Link>
        ))}
        {nextPage.map(post => (
          <Link href={`/post/${post.uid}`} key={post.uid}>
            <div className={styles.posts}>
              <a>
                <h2>{post.data.title}</h2>
                <p className={styles.subtitle}>{post.data.subtitle}</p>
                <div className={styles.infoContainer}>
                  <div className={styles.info}>
                    <FiCalendar />
                    <time>{post.first_publication_date}</time>
                  </div>
                  <div className={styles.info}>
                    <FiUser />
                    <p>{post.data.author}</p>
                  </div>
                </div>
              </a>
            </div>
          </Link>
        ))}
        <button
          type="button"
          onClick={handleLoadNextPage}
          className={`${styles.loadMorePosts} ${
            nextPageUrl ? '' : styles.hideButton
          }`}
        >
          Carregar mais posts
        </button>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['post.title', 'post.content'],
      pageSize: 2,
    }
  );

  function resultsPosts(response: ApiSearchResponse): Post[] {
    return response.results.map(post => {
      return {
        uid: post.uid,
        data: {
          title: RichText.asText(post.data.title),
          subtitle: RichText.asText(post.data.subtitle),
          author: RichText.asText(post.data.author),
        },
        first_publication_date: format(
          new Date(post.first_publication_date),
          'dd MMM yyyy',
          {
            locale: ptBR,
          }
        ),
      };
    });
  }

  const results = resultsPosts(postsResponse);

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results,
      },
      revalidate: 60 * 30, // 30 minutes
    },
  };
};
