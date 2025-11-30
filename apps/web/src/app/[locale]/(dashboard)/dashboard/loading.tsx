import Loading from '@/components/loading';

export default function HomeLoading() {
  return (
    <div className="fixed inset-0 pl-[256px] flex items-center justify-center">
      <Loading width={120} height={45} />
    </div>
  );
}
