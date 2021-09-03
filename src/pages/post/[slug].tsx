import { GetStaticPaths, GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

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
    return <div>Carregando...</div>;
  }

  const numOfWords = post.data.content.reduce((acc, current) => {
    return (
      acc +
      current.heading.split(' ').length +
      RichText.asText(current.body).split(' ').length
    );
  }, 0);
  const timeToRead = Math.ceil(numOfWords / 200);

  return post?.data ? (
    <div className={styles.imgContainer}>
      <img src={post.data.banner.url} alt="banner" />
      <div className={`${styles.container} ${commonStyles.contentContainer}`}>
        <h1>{post.data.title}</h1>
        <div className={styles.info}>
          <time>
            <FiCalendar size={20} />
            {format(new Date(post.first_publication_date), 'dd LLL yyyy', {
              locale: ptBR,
            })}
          </time>
          <span>
            <FiUser size={20} />
            {post.data.author}
          </span>
          <span>
            <FiClock size={20} />
            {timeToRead} min
          </span>
        </div>
        {post.data.content.map(content => (
          <div key={content.heading} className={styles.contentPartsContainer}>
            <h2>{content.heading}</h2>
            <div
              dangerouslySetInnerHTML={{
                __html: RichText.asHtml(content.body),
              }}
            />
          </div>
        ))}
      </div>
    </div>
  ) : null;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    Prismic.predicates.at('document.type', 'posts'),
    { fetch: 'posts.uid', pageSize: 1 }
  );

  const paths = posts.results.map(result => ({ params: { slug: result.uid } }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const { slug } = context.params;
  console.log(slug);

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const content = response.data.content.map(contentPart => {
    return {
      heading: contentPart.heading,
      body: contentPart.body,
    };
  });

  const post = {
    first_publication_date: response.first_publication_date,
    uid: response.uid,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content,
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 30,
  };
};
